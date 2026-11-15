import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class ReportsService {
  constructor(private readonly db: SupabaseService) {}
  async findAllPurchases() {
    const { data, error } = await this.db
      .getAdminClient()
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error)
      throw new InternalServerErrorException(
        "Subscription reporting is not configured",
      );
    return data;
  }
}
