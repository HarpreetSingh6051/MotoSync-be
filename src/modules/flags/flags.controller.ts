import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { FlagsService } from './flags.service';

@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Get()
  findAll() {
    return this.flagsService.findAll();
  }

  @Get('admin')
  findAllAdmin() {
    return this.flagsService.findAllAdmin();
  }

  @Post()
  upsert(@Body() flag: any) {
    return this.flagsService.upsert(flag);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.flagsService.remove(key);
  }
}
