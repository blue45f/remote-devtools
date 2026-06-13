import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesModule } from '@remote-platform/core';
import { RecordEntity, ScreenEntity } from '@remote-platform/entity';

import { S3Module } from '../s3/s3.module';

import { SessionReplayController } from './session-replay.controller';
import { SessionReplayService } from './session-replay.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity, ScreenEntity]), ServicesModule, S3Module],
  controllers: [SessionReplayController],
  providers: [SessionReplayService],
  exports: [SessionReplayService],
})
export class SessionReplayModule {}
