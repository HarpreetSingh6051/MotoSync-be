import { AuthController } from "./auth.controller";
describe("Auth gateway", () => {
  const config = {
    get: (name: string) =>
      ({
        SUPABASE_URL: "https://auth.example",
        SUPABASE_ANON_KEY: "public-key",
      })[name],
  };
  const response = () => {
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn(),
      type: jest.fn(),
      send: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.type.mockReturnValue(res);
    return res;
  };
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  it("forwards password authentication to the configured provider and preserves errors", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        status: 400,
        text: async () =>
          JSON.stringify({
            error_code: "invalid_credentials",
            msg: "Invalid login credentials",
          }),
      });
    global.fetch = fetchMock;
    const res = response();
    await new AuthController(config as any).forward(
      "token",
      {
        method: "POST",
        query: { grant_type: "password" },
        headers: {},
        body: { email: "admin@example.com", password: "test" },
      } as any,
      res,
    );
    expect(fetchMock.mock.calls[0][0].href).toBe(
      "https://auth.example/auth/v1/token?grant_type=password",
    );
    expect(fetchMock.mock.calls[0][1].headers.apikey).toBe("public-key");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("does not expose admin, signup or arbitrary proxy endpoints", async () => {
    global.fetch = jest.fn();
    const res = response();
    await new AuthController(config as any).forward(
      "signup",
      { method: "POST" } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it("fails with a useful error when upstream is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network"));
    await expect(
      new AuthController(config as any).forward(
        "token",
        { method: "POST", query: {}, headers: {}, body: {} } as any,
        response(),
      ),
    ).rejects.toThrow("Cannot reach authentication provider");
  });
});
