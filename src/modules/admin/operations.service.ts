import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class OperationsService {
  constructor(private readonly db: SupabaseService) {}
  private result(r: any) {
    if(r.error){
      if(r.error.code==='P0001')throw new BadRequestException(r.error.message);
      if(r.error.code==='23505')throw new ConflictException('A record with that identifier already exists');
      if(r.error.code==='23503')throw new BadRequestException('A selected rider or group no longer exists');
      throw r.error;
    }
    return r.data;
  }
  async analytics() {
    return this.result(
      await this.db.getAdminClient().rpc("admin_platform_analytics"),
    );
  }
  async operate(operation: string, entry: any, actor: string) {
    if (
      operation === "ride" &&
      new Date(entry.start_time).getTime() <= Date.now()
    )
      throw new BadRequestException("Choose a future ride time");
    if (
      ((operation === "ride" && entry.visibility === "group_only") ||
        (operation === "announcement" && entry.audience === "club")) &&
      !entry.club_id
    )
      throw new BadRequestException("Select a group");
    if (
      operation === "announcement" &&
      entry.audience !== "club" &&
      entry.club_id
    )
      throw new BadRequestException(
        "A group can only be selected for a group-specific announcement",
      );
    if (
      entry.expires_at &&
      new Date(entry.expires_at) <= new Date(entry.publish_at)
    )
      throw new BadRequestException("Expiry must follow publication");
    return this.result(
      await this.db
        .getAdminClient()
        .rpc("admin_operate", { operation, entry, actor_id: actor }),
    );
  }
  async list(table: string, page = "1") {
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const result = await this.db
      .getAdminClient()
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((p - 1) * 25, p * 25 - 1);
    return { items: this.result(result), total: result.count, page: p };
  }
  async report(dataset: string) {
    const data = await this.analytics();
    if (!["summary", "countries", "ride_status", "cities"].includes(dataset))
      throw new BadRequestException("Unknown report");
    const rows =
      dataset === "summary"
        ? Object.entries(data.totals).map(([metric, count]) => ({
            metric,
            count,
          }))
        : data[dataset];
    return { dataset, generated_at: new Date().toISOString(), rows };
  }
}
