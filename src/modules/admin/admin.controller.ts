import { AdminAccountsService } from "./accounts.service";
import { AdminAccountDto, AdminCreateDto, AdminRoleDto } from "./accounts.dto";
import { ConfigAdminService } from "./config.service";
import { ConfigWriteDto } from "./config.dto";
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { ClubPatchDto, UserPatchDto } from "./admin.dto";
@Controller("admin")
export class AdminController {
  constructor(
    private readonly accounts: AdminAccountsService,
    private readonly service: AdminService,
    private readonly config: ConfigAdminService,
  ) {}
  @Get("accounts") adminAccounts() {
    return this.accounts.accounts();
  }
  @Get("roles") adminRoles() {
    return this.accounts.roles();
  }
  @Post("accounts") createAdmin(@Body() body: AdminCreateDto, @Req() req: any) {
    return this.accounts.create(body, req.adminId);
  }
  @Put("accounts/:id") saveAdmin(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AdminAccountDto,
    @Req() req: any,
  ) {
    return this.accounts.save(id, body, req.adminId);
  }
  @Put("roles/:id") saveRole(
    @Param("id") id: string,
    @Body() body: AdminRoleDto,
    @Req() req: any,
  ) {
    return this.accounts.role(id, body, req.adminId);
  }
  @Get("config/:resource") configList(@Param("resource") resource: string) {
    return this.config.list(resource);
  }
  @Put("config/:resource/:id") configWrite(
    @Param("resource") resource: string,
    @Param("id") id: string,
    @Body() body: ConfigWriteDto,
    @Req() req: any,
  ) {
    return this.config.write(resource, id, body.values, req.adminId);
  }
  @Get("rides") rides(
    @Query("page") page: string,
    @Query("search") search: string,
  ) {
    return this.service.list("rides", page, search);
  }
  @Get("users") users(
    @Query("page") page: string,
    @Query("search") search: string,
  ) {
    return this.service.users(page, search);
  }
  @Get("users/:id/groups") groups(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.groups(id);
  }
  @Put("users/:id") update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UserPatchDto,
    @Req() req: any,
  ) {
    return this.service.updateUser(id, body, req.adminId);
  }
  @Get("clubs") clubs(
    @Query("page") page: string,
    @Query("search") search: string,
  ) {
    return this.service.list("clubs", page, search);
  }
  @Get("clubs/:id/members") members(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.members(id);
  }
  @Put("clubs/:id") club(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ClubPatchDto,
    @Req() req: any,
  ) {
    return this.service.verify(id, body.verified, req.adminId);
  }
  @Get("dashboard") dashboard() {
    return this.service.dashboard();
  }
  @Get("audit") audit() {
    return this.service.audit();
  }
}
