import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SupabaseService } from "./supabase/supabase.service";
@Controller("announcements")
export class AnnouncementsController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: SupabaseService,
  ) {}
  @Get() async feed(
    @Headers("authorization") auth: string,
    @Query("page") page = "1",
  ) {
    const token = auth?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException();
    const user = await this.db.getClient().auth.getUser(token);
    if (user.error || !user.data.user) throw new UnauthorizedException();
    const client = createClient(
      this.config.getOrThrow<string>("SUPABASE_URL"),
      this.config.getOrThrow<string>("SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: auth } },
      },
    );
    const n = Math.max(1, Math.floor(Number(page) || 1));
    const result = await client
      .from("platform_announcements")
      .select("id,title,body,audience,club_id,publish_at,expires_at")
      .order("publish_at", { ascending: false })
      .range((n - 1) * 25, n * 25 - 1);
    if (result.error) throw result.error;
    return result.data;
  }
}
