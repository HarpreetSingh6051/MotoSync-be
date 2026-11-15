import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable()
export class PlansService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  }

  async findAllAdmin() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  }

  async write(plan: any, actor: string, create: boolean) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .rpc("admin_save_plan", {
        plan_data: { ...plan, price_inr: 0, price_usd: 0 },
        actor_id: actor,
        is_new: create,
      });
    if (error)
      throw new InternalServerErrorException("Plan could not be saved");
    return data;
  }

  async create(plan: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from("subscription_plans")
      .insert({ ...plan, price_inr: 0, price_usd: 0 })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, plan: any) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from("subscription_plans")
      .update({ ...plan, price_inr: 0, price_usd: 0 })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async archive(id: string, actor: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from("subscription_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new InternalServerErrorException("Plan not found");
    return this.write({ ...data, is_active: false }, actor, false);
  }
  async remove(id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from("subscription_plans")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return { message: "Plan deleted" };
  }
}
