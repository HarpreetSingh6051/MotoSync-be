import { PlanDto } from "../admin/admin.dto";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { PlansService } from "./plans.service";

@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get("admin")
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Post()
  create(@Body() plan: PlanDto, @Req() req: any) {
    return this.plansService.write(plan, req.adminId, true);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() plan: PlanDto, @Req() req: any) {
    return this.plansService.write({ ...plan, id }, req.adminId, false);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.plansService.archive(id, req.adminId);
  }
}
