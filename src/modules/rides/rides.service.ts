import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class RidesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rides')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('rides')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}
