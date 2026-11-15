import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  NotFoundException,
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
          "RidesController",
        ].includes(controller));
    if (!privileged) {
      const feature = (
        {
          RidesController: "rides",
          ClubsController: "clubs",
          SoundsController: "sounds",
          CampaignsController: "campaigns",
        } as Record<string, string>
      )[controller];
      if (feature) {
        const { data, error } = await this.db
          .getClient()
          .from("app_feature_flags")
          .select("service_status,maintenance_message")
          .eq("key", feature)
          .maybeSingle();
        if (error)
          throw new ServiceUnavailableException(
            "Feature availability cannot be checked. Verify migration 008.",
          );
        if (data?.service_status === "maintenance")
          throw new ServiceUnavailableException(
            data.maintenance_message ||
              "This feature is temporarily out of service",
          );
        if (data?.service_status === "disabled")
          throw new NotFoundException("This feature is disabled");
      }
      return true;
    }
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException("Sign in as an administrator");
    const { data, error } = await this.db.getClient().auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException("Session expired");
    const profile = await this.db
      .getAdminClient()
      .from("admin_users")
      .select("role_id,status,admin_roles(permissions)")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.status !== "active")
      throw new ForbiddenException("Active administrator account required");
    const role = profile.data?.admin_roles as unknown as {
      permissions: string[];
    };
    const managing = [
      "adminAccounts",
      "adminRoles",
      "saveAdmin",
      "createAdmin",
      "saveRole",
    ].includes(handler);
    const required = managing
      ? "manage_admins"
      : req.method === "GET"
        ? "read"
        : "write";
    if (!role?.permissions?.includes(required))
      throw new ForbiddenException(
        "Your admin role does not permit this action",
      );
    req.adminId = data.user.id;
    return true;
  }
}
