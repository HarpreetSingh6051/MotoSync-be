import { OperationsService } from "./operations.service";
import { AdminAccountsService } from "./accounts.service";
import { ConfigAdminService } from "./config.service";
import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController],
  providers: [
    OperationsService,
    AdminService,
    ConfigAdminService,
    AdminAccountsService,
  ],
  exports: [ConfigAdminService],
})
export class AdminModule {}
