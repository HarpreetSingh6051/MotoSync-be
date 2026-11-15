import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>("SUPABASE_URL");
    const anonKey = this.configService.get<string>("SUPABASE_ANON_KEY");
    if (!url || !anonKey)
      throw new Error(
        "Configure SUPABASE_URL and SUPABASE_ANON_KEY in the backend environment",
      );
    const serviceRoleKey =
      this.configService.get<string>("SUPABASE_SECRET_KEY")?.trim() ||
      this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey?.startsWith("sb_publishable_"))
      throw new Error(
        "A public key was placed in the backend secret-key variable. Use a server secret key.",
      );
    if (!serviceRoleKey)
      new Logger("Supabase").warn(
        "Admin APIs unavailable: set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in backend environment and restart.",
      );
    this.supabase = createClient(url, anonKey);

    if (serviceRoleKey) {
      this.supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    if (!this.supabaseAdmin)
      throw new ServiceUnavailableException(
        "Configure SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in the backend environment, then restart the backend",
      );
    return this.supabaseAdmin;
  }
}
