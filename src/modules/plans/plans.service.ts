import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class PlansService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findAllAdmin() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async create(plan: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('subscription_plans')
      .insert(plan)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, plan: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('subscription_plans')
      .update(plan)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Plan deleted' };
  }
}
