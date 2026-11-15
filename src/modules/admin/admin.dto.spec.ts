import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { PlanDto, UserPatchDto } from "./admin.dto";
describe("Admin input boundaries", () => {
  it("rejects profile privilege escalation", async () => {
    const errors = await validate(
      plainToInstance(UserPatchDto, { role: "super_admin" }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.length).toBeGreaterThan(0);
  });
  it("rejects negative pricing and invalid audiences", async () => {
    const errors = await validate(
      plainToInstance(PlanDto, {
        id: "p",
        name: "Plan",
        tagline: "",
        audience: "everyone",
        billing_interval: "monthly",
        price_inr: -1,
        price_usd: 0,
        is_active: true,
        is_popular: false,
        sort_order: 0,
        features: ["Chat"],
      }),
    );
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(["price_inr", "audience"]),
    );
  });
});
