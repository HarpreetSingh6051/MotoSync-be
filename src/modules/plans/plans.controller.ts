import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Post()
  create(@Body() plan: any) {
    return this.plansService.create(plan);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() plan: any) {
    return this.plansService.update(id, plan);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
