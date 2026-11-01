import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CampaignsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('sponsored_campaigns')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findAllAdmin() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('sponsored_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async upsert(campaign: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('sponsored_campaigns')
      .upsert(campaign)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('sponsored_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Campaign deleted' };
  }
}
