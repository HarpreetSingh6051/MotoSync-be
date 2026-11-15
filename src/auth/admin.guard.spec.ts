import { AdminGuard } from "./admin.guard";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
describe("AdminGuard", () => {
  let db: any, guard: AdminGuard;
  const ctx = (controller: string, handler: string, token?: string) =>
    ({
      getClass: () => ({ name: controller }),
      getHandler: () => ({ name: handler }),
      switchToHttp: () => ({
        getRequest: () => ({
          method: "GET",
          headers: { authorization: token },
        }),
      }),
    }) as any;
  beforeEach(() => {
    db = {
      getClient: () => ({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({
              data: { user: { id: "actor" } },
              error: null,
            }),
        },
      }),
      getAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { role_id: "super_admin", status: "active", admin_roles:{permissions:["read","write","manage_admins"]} },
              }),
            }),
          }),
        }),
      }),
    };
    guard = new AdminGuard(db);
  });
  it("keeps the published catalogue public", async () =>
    expect(await guard.canActivate(ctx("PlansController", "findAll"))).toBe(
      true,
    ));
  it("rejects anonymous admin data access", async () =>
    expect(
      guard.canActivate(ctx("AdminController", "users")),
    ).rejects.toBeInstanceOf(UnauthorizedException));
  it("rejects anonymous draft catalogue access", async () =>
    expect(
      guard.canActivate(ctx("PlansController", "findAllAdmin")),
    ).rejects.toBeInstanceOf(UnauthorizedException));
  it("accepts a verified active super admin", async () =>
    expect(
      await guard.canActivate(ctx("AdminController", "users", "Bearer valid")),
    ).toBe(true));
  it("rejects expired tokens", async () => {
    db.getClient = () => ({
      auth: { getUser: async () => ({ data: { user: null }, error: true }) },
    });
    await expect(
      guard.canActivate(ctx("AdminController", "users", "Bearer expired")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it("rejects riders and inactive admins", async () => {
    for (const profile of [
      { role: "rider", status: "active" },
      { role: "super_admin", status: "banned" },
    ]) {
      db.getAdminClient = () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: profile }) }),
          }),
        }),
      });
      await expect(
        guard.canActivate(ctx("AdminController", "users", "Bearer valid")),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});
