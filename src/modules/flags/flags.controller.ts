import { ConfigAdminService } from '../admin/config.service';
import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { FlagsService } from './flags.service';

@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService, private readonly config: ConfigAdminService) {}

  @Get()
  findAll() {
    return this.flagsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.flagsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() flag: any, @Req() req: any) {
    const { key: id, ...values } = flag;
    if (!values.service_status) values.service_status = values.is_enabled === false ? 'disabled' : 'enabled';
    return this.config.write('flags', id, values, req.adminId);
  }

  @Delete(':key')
  remove(@Param('key') key: string, @Req() req: any) {
    return this.config.archive('flags', key, req.adminId);
  }
}
