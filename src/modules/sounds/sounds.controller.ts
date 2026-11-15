import { ConfigAdminService } from '../admin/config.service';
import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { SoundsService } from './sounds.service';

@Controller('sounds')
export class SoundsController {
  constructor(private readonly soundsService: SoundsService, private readonly config: ConfigAdminService) {}

  @Get()
  findAll() {
    return this.soundsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.soundsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() sound: any, @Req() req: any) {
    const { id: id, ...values } = sound;
    
    return this.config.write('sounds', id, values, req.adminId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.config.archive('sounds', id, req.adminId);
  }
}
