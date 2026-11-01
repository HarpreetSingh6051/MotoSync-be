import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.campaignsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() campaign: any) {
    return this.campaignsService.upsert(campaign);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
