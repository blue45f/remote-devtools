import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RecordEntity, TicketLogEntity } from "@remote-platform/entity";

import { ActivityController } from "./activity.controller";
import { ActivityService } from "./activity.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity, TicketLogEntity])],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
