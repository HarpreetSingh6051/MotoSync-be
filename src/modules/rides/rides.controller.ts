import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RidesService } from './rides.service';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get()
  findAll() {
    return this.ridesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findOne(id);
  }

  @Post()
  create(@Body() createRideDto: any) {
    return this.ridesService.create(createRideDto);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.ridesService.join(id, body.userId, body.role);
  }
}
