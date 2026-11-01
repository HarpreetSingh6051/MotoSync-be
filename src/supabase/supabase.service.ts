import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://hxsifqmspboitoqnkvwj.supabase.co';
    const anonKey =
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_orc9XA1d8xsb5AUdLNA-MQ_qyUukZ36';
    const serviceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    return this.supabaseAdmin || this.supabase;
  }
}
