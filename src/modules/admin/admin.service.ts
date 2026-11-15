import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class AdminService {
  constructor(private readonly db: SupabaseService) {}
  private result(result: any) {
    if (result.error) throw result.error;
    return result.data;
  }
  async list(table: string, page = "1", search = "", country = "", city = "") {
    const n = Math.max(1, Math.min(100000, Number(page) || 1));
    let query = this.db
      .getAdminClient()
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((n - 1) * 25, n * 25 - 1);
    if (table === "profiles") query = query.eq("is_rider", true);
    if (table === "profiles" && country)
      query = query.eq("country_region", country);
    if (table === "profiles" && city) query = query.eq("city_region", city);
    const term = search.replace(/[%_(),.]/g, "").slice(0, 80);
    if (term)
      query = query.ilike(
        table === "profiles"
          ? "full_name"
          : table === "rides"
            ? "title"
            : "name",
        `%${term}%`,
      );
    const result = await query;
    return { items: this.result(result), total: result.count, page: n };
  }
  users(page: string, search: string, country = "", city = "") {
    return this.list("profiles", page, search, country, city);
  }
  async updateUser(id: string, patch: any, actor: string) {
    if (id === actor && patch.status && patch.status !== "active")
      throw new BadRequestException(
        "You cannot suspend your own administrator account",
      );
    if (patch.subscription_plan_id) {
      const plan = this.result(
        await this.db
          .getAdminClient()
          .from("subscription_plans")
          .select("id")
          .eq("id", patch.subscription_plan_id)
          .eq("is_active", true)
          .single(),
      );
      if (!plan) throw new BadRequestException("Choose an active plan");
    }
    return this.result(
      await this.db.getAdminClient().rpc("admin_update_profile", {
        target_id: id,
        changes: patch,
        actor_id: actor,
      }),
    );
  }
  async groups(id: string) {
    return this.result(
      await this.db
        .getAdminClient()
        .from("club_members")
        .select("role,joined_at,clubs(id,name,privacy)")
        .eq("user_id", id)
        .limit(1000),
    );
  }
  async members(id: string) {
    return this.result(
      await this.db
        .getAdminClient()
        .from("club_members")
        .select(
          "role,joined_at,profiles(id,full_name,handle,status,subscription_plan_id)",
        )
        .eq("club_id", id)
        .order("joined_at")
        .limit(1000),
    );
  }
  async verify(id: string, verified: boolean, actor: string) {
    return this.result(
      await this.db.getAdminClient().rpc("admin_verify_club", {
        target_id: id,
        verified_value: verified,
        actor_id: actor,
      }),
    );
  }
  async audit() {
    return this.result(
      await this.db
        .getAdminClient()
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    );
  }
  async dashboard() {
    const client = this.db.getAdminClient();
    const tables = ["profiles", "clubs", "club_members", "rides"];
    const counts = await Promise.all(
      tables.map((table) =>
        client.from(table).select(table === "club_members" ? "user_id" : "id", {
          count: "exact",
          head: true,
        }),
      ),
    );
    counts[0] = await client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_rider", true);
    counts.forEach((result) => this.result(result));
    const trend = this.result(await client.rpc("admin_registration_trend"));
    const distribution = this.result(
      await client.rpc("admin_plan_distribution"),
    );
    const analytics = this.result(await client.rpc("admin_platform_analytics"));
    return {
      analytics,
      counts: Object.fromEntries(
        tables.map((table, i) => [table, counts[i].count]),
      ),
      trend,
      distribution,
    };
  }
}
