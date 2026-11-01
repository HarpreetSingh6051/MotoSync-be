import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private supabaseService: SupabaseService) {}

  async getUsers() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateUser(userId: string, updates: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAuditLog() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  async logAction(actorId: string, action: string, entity: string, entityId: string, payload: any = {}) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('admin_audit_log')
      .insert({
        actor_id: actorId,
        action,
        entity,
        entity_id: entityId,
        payload,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
