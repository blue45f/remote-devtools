import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Record, Screen } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";
import { S3Module } from "../s3/s3.module";
import { ScreenModule } from "../screen/screen.module";
import { SessionReplayController } from "./session-replay.controller";
import { SessionReplayService } from "./session-replay.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Record, Screen]),
    RecordModule,
    ScreenModule,
    S3Module,
  ],
  controllers: [SessionReplayController],
  providers: [SessionReplayService],
  exports: [SessionReplayService],
})
export class SessionReplayModule {}
