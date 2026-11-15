import {
  requestLogging,
  ApiExceptionFilter,
} from "../../common/http-observability";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../app.module";
import { SupabaseService } from "../../supabase/supabase.service";
describe("Admin API route integration (isolated database fixtures)", () => {
  let app: INestApplication, base: string;
  const adminId = "11111111-1111-4111-8111-111111111111";
  function query() {
    const q: any = {};
    for (const name of [
      "select",
      "order",
      "range",
      "eq",
      "limit",
      "ilike",
      "upsert",
      "insert",
      "update",
      "delete",
    ])
      q[name] = () => q;
    q.single = async () => ({
      data: { id: adminId, role: "super_admin", status: "active" },
      error: null,
    });
    q.maybeSingle = async () => ({
      data: { service_status: "enabled" },
      error: null,
    });
    q.then = (resolve: any) =>
      Promise.resolve({ data: [], count: 0, error: null }).then(resolve);
    return q;
  }
  beforeAll(async () => {
    const client = {
      from: () => query(),
      rpc: async () => ({ data: [], error: null }),
      auth: {
        getUser: async () => ({ data: { user: { id: adminId } }, error: null }),
      },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseService)
      .useValue({ getClient: () => client, getAdminClient: () => client })
      .compile();
    app = module.createNestApplication();
    app.use(requestLogging);
    app.useGlobalFilters(new ApiExceptionFilter());
    app.setGlobalPrefix("api/v1");
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
  afterAll(async () => {
    await app?.close();
  });
  it.each([
    "/admin/dashboard",
    "/admin/users",
    "/admin/clubs",
    "/admin/rides",
    "/admin/audit",
    "/admin/config/flags",
    "/admin/config/sounds",
    "/admin/config/campaigns",
    "/plans/admin",
    "/flags/admin",
    "/sounds/admin",
    "/campaigns/admin",
    "/reports/purchases",
    `/admin/users/${adminId}/groups`,
    `/admin/clubs/${adminId}/members`,
  ])("serves authenticated read %s", async (path) => {
    const response = await fetch(base + "/api/v1" + path, {
      headers: { Authorization: "Bearer test-fixture" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
  it("does not allow feature mutation without a session", async () => {
    const response = await fetch(base + "/api/v1/admin/config/flags/rides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: { name: "Rides", service_status: "enabled" },
      }),
    });
    expect(response.status).toBe(401);
  });
  it("validates and saves feature settings through the real controller", async () => {
    const response = await fetch(base + "/api/v1/admin/config/flags/rides", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-fixture",
      },
      body: JSON.stringify({
        values: {
          name: "Rides",
          service_status: "maintenance",
          maintenance_message: "Back soon",
        },
      }),
    });
    expect(response.status).toBe(200);
  });
});
