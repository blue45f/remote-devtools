import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  RecordEntity,
  UserEntity,
  DeviceInfoEntity,
} from "@remote-platform/entity";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketLogEntity,
      TicketComponentEntity,
      TicketLabelEntity,
      RecordEntity,
      UserEntity,
      DeviceInfoEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
