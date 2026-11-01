import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { SoundsService } from './sounds.service';

@Controller('sounds')
export class SoundsController {
  constructor(private readonly soundsService: SoundsService) {}

  @Get()
  findAll() {
    return this.soundsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.soundsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() sound: any) {
    return this.soundsService.upsert(sound);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.soundsService.remove(id);
  }
}
