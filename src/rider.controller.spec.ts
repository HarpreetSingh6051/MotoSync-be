import { Test } from "@nestjs/testing";
import { ValidationPipe, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RiderController } from "./rider.controller";
import { SupabaseService } from "./supabase/supabase.service";
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}));
describe("Rider HTTP boundary", () => {
  let app: INestApplication,
    base: string,
    active: boolean,
    status: string,
    rpc: jest.Mock;
  const actor = "11111111-1111-4111-8111-111111111111",
    target = "22222222-2222-4222-8222-222222222222";
  beforeAll(async () => {
    const chain = (data: () => any) => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle: async () => ({ data: data(), error: null }),
    });
    rpc = jest.fn(async () => ({ data: { ok: true }, error: null }));
    const module = await Test.createTestingModule({
      controllers: [RiderController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === "SUPABASE_URL"
                ? "https://example.supabase.co"
                : "public-key",
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: () => ({
              auth: {
                getUser: async (token: string) => ({
                  data: { user: token === "valid" ? { id: actor } : null },
                  error: null,
                }),
              },
              from: () =>
                chain(() => ({
                  service_status: status,
                  maintenance_message: "Maintenance",
                })),
            }),
            getAdminClient: () => ({
              from: () =>
                chain(() => ({
                  id: actor,
                  is_rider: active,
                  status: "active",
                })),
              rpc,
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  beforeEach(() => {
    active = true;
    status = "enabled";
    rpc.mockClear();
  });
  afterAll(async () => {
    await app.close();
  });
  const post = (body: any, token = "valid") =>
    fetch(base + "/rider/actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  it("rejects missing sessions", async () => {
    expect((await fetch(base + "/rider/me")).status).toBe(401);
  });
  it("rejects invalid tokens", async () => {
    expect(
      (await post({ operation: "join_club", target_id: target }, "invalid"))
        .status,
    ).toBe(401);
  });
  it("does not accept administrator-only identities as riders", async () => {
    active = false;
    expect(
      (await post({ operation: "join_club", target_id: target })).status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects actor spoofing and invalid UUIDs", async () => {
    expect(
      (
        await post({
          operation: "join_club",
          target_id: target,
          actor_id: target,
        })
      ).status,
    ).toBe(400);
    expect(
      (await post({ operation: "join_club", target_id: "bad" })).status,
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("blocks feature maintenance before a write", async () => {
    status = "maintenance";
    expect(
      (await post({ operation: "join_club", target_id: target })).status,
    ).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("uses the verified identity in transactional operations", async () => {
    expect(
      (await post({ operation: "join_club", target_id: target })).status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("rider_operate", {
      operation: "join_club",
      target_id: target,
      actor_id: actor,
      message_body: null,
    });
  });
  it("rejects empty messages", async () => {
    expect(
      (await post({ operation: "message", target_id: target, message: "  " }))
        .status,
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid pagination", async () => {
    expect(
      (
        await fetch(base + "/rider/feed/rides?page=-1", {
          headers: { Authorization: "Bearer valid" },
        })
      ).status,
    ).toBe(400);
  });
});
