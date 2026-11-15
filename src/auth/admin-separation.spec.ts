import { AdminGuard } from "./admin.guard";
import { ForbiddenException } from "@nestjs/common";
describe("Separate staff and rider authorization", () => {
  function fixture(account: any, method = "GET", handler = "users") {
    const from = jest
      .fn()
      .mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: account, error: null }),
          }),
        }),
      });
    const guard = new AdminGuard({
      getClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: "staff-id" } } }) },
      }),
      getAdminClient: () => ({ from }),
    } as any);
    const context = {
      getClass: () => ({ name: "AdminController" }),
      getHandler: () => ({ name: handler }),
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers: { authorization: "Bearer test" },
        }),
      }),
    } as any;
    return { guard, from, context };
  }
  it("denies a rider identity without a staff account regardless of legacy rider role", async () => {
    const { guard, from, context } = fixture(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(from).toHaveBeenCalledWith("admin_users");
    expect(from).not.toHaveBeenCalledWith("profiles");
  });
  it("permits read-only staff to read records", async () => {
    const { guard, context } = fixture({
      status: "active",
      admin_roles: { permissions: ["read"] },
    });
    expect(await guard.canActivate(context)).toBe(true);
  });
  it("denies writes for read-only staff", async () => {
    const { guard, context } = fixture(
      { status: "active", admin_roles: { permissions: ["read"] } },
      "PUT",
    );
    await expect(guard.canActivate(context)).rejects.toThrow("does not permit");
  });
  it("denies account management for ordinary operators", async () => {
    const { guard, context } = fixture(
      { status: "active", admin_roles: { permissions: ["read", "write"] } },
      "GET",
      "adminAccounts",
    );
    await expect(guard.canActivate(context)).rejects.toThrow("does not permit");
  });
  it("denies suspended administrators even with full permissions", async () => {
    const { guard, context } = fixture({
      status: "suspended",
      admin_roles: { permissions: ["read", "write", "manage_admins"] },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      "Active administrator",
    );
  });
});
