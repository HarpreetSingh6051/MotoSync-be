import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}
  private result(response: any) {
    if (response.error) {
      if (response.error.code === "PGRST116")
        throw new NotFoundException("Record not found");
      throw response.error;
    }
    return response.data;
  }
  async findAll() {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("profiles")
        .select("*")
        .eq("is_rider", true)
        .order("created_at", { ascending: false })
        .limit(1000),
    );
  }
  async findOne(id: string) {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("profiles")
        .select("*")
        .eq("is_rider", true)
        .eq("id", id)
        .single(),
    );
  }
  async createOrUpdate(userData: any) {
    return this.result(
      await this.supabaseService
        .getAdminClient()
        .from("profiles")
        .upsert(userData)
        .select()
        .single(),
    );
  }
}
