import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class ClubsService {
  constructor(private readonly supabaseService: SupabaseService) {}
  private result(response: any) {
    if (response.error) {
      if (response.error.code === "PGRST116")
        throw new NotFoundException("Record not found");
      throw response.error;
    }
    return response.data;
  }
  async findAll() {
    return this.result(
      await this.supabaseService
        .getClient()
        .from("clubs")
        .select("*")
        .eq("privacy", "public")
        .order("created_at", { ascending: false })
        .limit(1000),
    );
  }
  async findOne(id: string) {
    return this.result(
      await this.supabaseService
        .getClient()
        .from("clubs")
        .select("*")
        .eq("id", id)
        .eq("privacy", "public")
        .single(),
    );
  }
  async create(clubData: any) {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("clubs")
        .insert({
          name: clubData.name,
          handle:
            clubData.handle ||
            clubData.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          description: clubData.description || "",
          city: clubData.city || "India",
          region: clubData.region || "India",
          riding_style:
            clubData.ridingStyle ||
            clubData.riding_style ||
            "Cruisers & Touring",
          badge_emoji: clubData.badgeEmoji || clubData.badge_emoji || "🏍️",
          privacy: clubData.privacy || "public",
          verified: Boolean(clubData.verified),
          accent: clubData.accent || "#F43F5E",
          created_by: clubData.createdBy || clubData.created_by,
        })
        .select()
        .single(),
    );
  }
  async update(id: string, updates: any) {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("clubs")
        .update(updates)
        .eq("id", id)
        .select()
        .single(),
    );
  }
}
