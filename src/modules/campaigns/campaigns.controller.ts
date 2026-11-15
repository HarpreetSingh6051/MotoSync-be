import { ConfigAdminService } from '../admin/config.service';
import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService, private readonly config: ConfigAdminService) {}

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.campaignsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() campaign: any, @Req() req: any) {
    const { id: id, ...values } = campaign;
    
    return this.config.write('campaigns', id, values, req.adminId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.config.archive('campaigns', id, req.adminId);
  }
}
