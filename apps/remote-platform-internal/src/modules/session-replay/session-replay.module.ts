import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Record, Screen } from "@remote-platform/entity";

import { S3Module } from "../s3/s3.module";
import { SessionReplayController } from "./session-replay.controller";
import { SessionReplayService } from "./session-replay.service";

@Module({
  imports: [TypeOrmModule.forFeature([Record, Screen]), S3Module],
  controllers: [SessionReplayController],
  providers: [SessionReplayService],
  exports: [SessionReplayService],
})
export class SessionReplayModule {}
