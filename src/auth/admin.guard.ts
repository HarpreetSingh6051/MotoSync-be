import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: SupabaseService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const privileged =
      ["AdminController", "ReportsController", "UsersController"].includes(
        controller,
      ) ||
      handler === "findAllAdmin" ||
      (req.method !== "GET" &&
        [
          "PlansController",
          "FlagsController",
          "SoundsController",
          "CampaignsController",
          "ClubsController",
        ].includes(controller));
    if (!privileged) return true;
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException("Sign in as an administrator");
    const { data, error } = await this.db.getClient().auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException("Session expired");
    const profile = await this.db
      .getAdminClient()
      .from("profiles")
      .select("role,status")
      .eq("id", data.user.id)
      .single();
    if (
      profile.error ||
      profile.data?.role !== "super_admin" ||
      profile.data?.status !== "active"
    )
      throw new ForbiddenException("Active super administrator required");
    req.adminId = data.user.id;
    return true;
  }
}
