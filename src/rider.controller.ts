import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  Param,
  Query,
  ParseUUIDPipe,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SupabaseService } from "./supabase/supabase.service";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class RiderActionDto {
  @IsIn(["join_club", "leave_club", "join_ride", "leave_ride", "message"])
  operation: string;
  @IsUUID() target_id: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

@Controller("rider")
export class RiderController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: SupabaseService,
  ) {}
  private async session(auth: string) {
    const token = auth?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
      throw new UnauthorizedException("Sign in to your rider account");
    const { data, error } = await this.db.getClient().auth.getUser(token);
    if (error || !data.user)
      throw new UnauthorizedException("Your session expired");
    const profile = await this.db
      .getAdminClient()
      .from("profiles")
      .select("id,full_name,city,country,is_rider,status")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data?.is_rider || profile.data.status !== "active")
      throw new ForbiddenException("An active rider account is required");
    const client = createClient(
      this.config.getOrThrow("SUPABASE_URL"),
      this.config.getOrThrow("SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: auth } },
      },
    );
    return { client, profile: profile.data, id: data.user.id };
  }
  private async feature(key: string) {
    const { data, error } = await this.db
      .getClient()
      .from("app_feature_flags")
      .select("service_status,maintenance_message")
      .eq("key", key)
      .maybeSingle();
    if (error)
      throw new ServiceUnavailableException(
        "Feature availability is unavailable",
      );
    if (data?.service_status === "maintenance")
      throw new ServiceUnavailableException(
        data.maintenance_message || "This feature is under maintenance",
      );
    if (data?.service_status === "disabled")
      throw new NotFoundException("This feature is disabled");
  }
  @Get("me") async me(@Headers("authorization") auth: string) {
    return (await this.session(auth)).profile;
  }
  @Get("feed/:kind") async feed(
    @Headers("authorization") auth: string,
    @Param("kind") kind: string,
    @Query("page") page = "1",
  ) {
    const { client, id } = await this.session(auth);
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1 || n > 100000)
      throw new BadRequestException("Invalid page");
    let query: any;
    switch (kind) {
      case "rides":
        await this.feature("rides");
        query = client
          .from("rides")
          .select(
            "id,title,route_summary,start_time,meetup_label,distance_km,status,visibility,max_riders,club_id",
          )
          .order("start_time", { ascending: false });
        break;
      case "clubs":
        await this.feature("clubs");
        query = client
          .from("clubs")
          .select("id,name,description,city,privacy,member_count")
          .order("name");
        break;
      case "memberships":
        await this.feature("clubs");
        query = client
          .from("club_members")
          .select("club_id,role,clubs(id,name,city)")
          .eq("user_id", id)
          .order("joined_at", { ascending: false });
        break;
      case "my-rides":
        await this.feature("rides");
        query = client
          .from("ride_participants")
          .select(
            "ride_id,rsvp_status,formation_role,rides(id,title,start_time,meetup_label,status)",
          )
          .eq("user_id", id)
          .neq("rsvp_status", "out")
          .order("updated_at", { ascending: false });
        break;
      case "expenses":
        await this.feature("splits");
        query = client
          .from("ride_expenses")
          .select(
            "id,title,amount,currency,per_rider_share,split_count,created_at,rides(title)",
          )
          .order("created_at", { ascending: false });
        break;
      case "announcements":
        query = client
          .from("platform_announcements")
          .select("id,title,body,publish_at")
          .order("publish_at", { ascending: false });
        break;
      default:
        throw new NotFoundException("Unknown rider feed");
    }
    const { data, error } = await query.range((n - 1) * 25, n * 25 - 1);
    if (error) throw error;
    return data;
  }
  @Get("clubs/:id/messages") async messages(
    @Headers("authorization") auth: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page") page = "1",
  ) {
    const { client } = await this.session(auth);
    await this.feature("chat");
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1 || n > 100000)
      throw new BadRequestException("Invalid page");
    const result = await client
      .from("chat_messages")
      .select("id,message_text,created_at,sender_id")
      .eq("club_id", id)
      .is("ride_id", null)
      .order("created_at", { ascending: false })
      .range((n - 1) * 25, n * 25 - 1);
    if (result.error) throw result.error;
    return result.data;
  }
  @Post("actions") async action(
    @Headers("authorization") auth: string,
    @Body() body: RiderActionDto,
  ) {
    const { id } = await this.session(auth);
    await this.feature(
      body.operation === "message"
        ? "chat"
        : body.operation.endsWith("club")
          ? "clubs"
          : "rides",
    );
    if (body.operation === "message" && !body.message?.trim())
      throw new BadRequestException("Enter a message");
    const result = await this.db
      .getAdminClient()
      .rpc("rider_operate", {
        operation: body.operation,
        target_id: body.target_id,
        message_body: body.message?.trim() || null,
        actor_id: id,
      });
    if (result.error) {
      if (result.error.code === "P0001")
        throw new BadRequestException(result.error.message);
      throw result.error;
    }
    return result.data;
  }
}
