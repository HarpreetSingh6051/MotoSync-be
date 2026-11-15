import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class RidesService {
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
        .from("rides")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(1000),
    );
  }
  async findOne(id: string) {
    return this.result(
      await this.supabaseService
        .getClient()
        .from("rides")
        .select("*")
        .eq("id", id)
        .eq("visibility", "public")
        .single(),
    );
  }
  async create(rideData: any) {
    const distanceKm = Number(
      rideData.distanceKm || rideData.distance_km || 120,
    );
    const startTime =
      rideData.startTime ||
      rideData.start_time ||
      new Date(Date.now() + 86400000).toISOString();
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("rides")
        .insert({
          title: rideData.title || "New group ride",
          route_summary:
            rideData.routeSummary ||
            rideData.route_summary ||
            "Scenic highway run",
          description: rideData.description || "",
          captain_id: rideData.captainId || rideData.captain_id || null,
          club_id: rideData.clubId || rideData.club_id || null,
          region_scope:
            rideData.regionScope || rideData.region_scope || "Near Me",
          distance_label:
            rideData.distanceLabel || `${distanceKm} km Roundtrip`,
          distance_km: distanceKm,
          start_time: startTime,
          meetup_label:
            rideData.meetupLabel ||
            rideData.meetup_label ||
            "Highway Meetup Point",
          visibility: rideData.visibility || "public",
          status: "upcoming",
          max_riders: Number(rideData.maxRiders || 25),
          split_enabled: Boolean(rideData.splitEnabled ?? true),
          difficulty: rideData.difficulty || "Spirited",
          hashtags: Array.isArray(rideData.hashtags)
            ? rideData.hashtags
            : ["MotoSync", "PackRide"],
          waypoints: rideData.waypoints || [],
        })
        .select()
        .single(),
    );
  }
  async join(rideId: string, userId: string, formationRole = "Pack Member") {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("ride_participants")
        .upsert({
          ride_id: rideId,
          user_id: userId,
          formation_role: formationRole,
          rsvp_status: "going",
        })
        .select()
        .single(),
    );
  }
}
