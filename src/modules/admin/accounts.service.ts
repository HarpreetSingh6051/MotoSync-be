import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService } from "../../supabase/supabase.service";
import { AdminAccountDto, AdminCreateDto, AdminRoleDto } from "./accounts.dto";
@Injectable()
export class AdminAccountsService {
  constructor(private readonly db: SupabaseService) {}
  private result(result: any) {
    if (result.error) throw result.error;
    return result.data;
  }
  async accounts() {
    return this.result(
      await this.db
        .getAdminClient()
        .from("admin_users")
        .select(
          "id,email,full_name,handle,role_id,status,created_at,admin_roles(name)",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
    );
  }
  async roles() {
    return this.result(
      await this.db
        .getAdminClient()
        .from("admin_roles")
        .select("*")
        .order("name"),
    );
  }
  async save(id: string, body: AdminAccountDto, actor: string) {
    return this.result(
      await this.db
        .getAdminClient()
        .rpc("admin_save_account", {
          account_id: id,
          changes: body,
          actor_id: actor,
        }),
    );
  }
  async role(id: string, body: AdminRoleDto, actor: string) {
    if (!/^[a-z0-9_]{3,40}$/.test(id) || id === "super_admin")
      throw new BadRequestException("Choose an editable role identifier");
    return this.result(
      await this.db
        .getAdminClient()
        .rpc("admin_save_role", {
          role_key: id,
          changes: body,
          actor_id: actor,
        }),
    );
  }
  async create(body: AdminCreateDto, actor: string) {
    const client = this.db.getAdminClient();
    const role = await client
      .from("admin_roles")
      .select("id")
      .eq("id", body.role_id)
      .single();
    if (role.error)
      throw new BadRequestException("Select an existing admin role");
    const { data, error } = await client.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      app_metadata: { account_type: "admin" },
      user_metadata: { full_name: body.full_name },
    });
    if (error) throw new BadRequestException(error.message);
    try {
      return await this.save(
        data.user.id,
        {
          full_name: body.full_name,
          role_id: body.role_id,
          status: body.status,
        },
        actor,
      );
    } catch (error) {
      const cleanup = await client.auth.admin.deleteUser(data.user.id);
      if (cleanup.error)
        throw new BadRequestException(
          "Admin record save failed; the unprivileged login requires cleanup in Supabase Auth",
        );
      throw error;
    }
  }
}
