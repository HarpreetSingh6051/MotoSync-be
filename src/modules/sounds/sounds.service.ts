import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SoundsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('exhaust_sounds')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findAllAdmin() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('exhaust_sounds')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async upsert(sound: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('exhaust_sounds')
      .upsert(sound)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('exhaust_sounds')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Sound deleted' };
  }
}
