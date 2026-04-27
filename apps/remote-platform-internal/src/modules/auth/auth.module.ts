import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PlanGuard } from "./plan.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PlanGuard],
  exports: [AuthService, PlanGuard],
})
export class AuthModule {}
