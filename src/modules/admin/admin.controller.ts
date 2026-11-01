import { Controller, Get, Put, Post, Body, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() updates: any) {
    return this.adminService.updateUser(id, updates);
  }

  @Get('audit')
  getAuditLog() {
    return this.adminService.getAuditLog();
  }

  @Post('audit')
  logAction(@Body() body: any) {
    return this.adminService.logAction(body.actorId, body.action, body.entity, body.entityId, body.payload);
  }
}
