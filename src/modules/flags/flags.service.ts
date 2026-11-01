import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class FlagsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('app_feature_flags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findAllAdmin() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('app_feature_flags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async upsert(flag: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('app_feature_flags')
      .upsert(flag)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(key: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('app_feature_flags')
      .delete()
      .eq('key', key);

    if (error) throw error;
    return { message: 'Flag deleted' };
  }
}
