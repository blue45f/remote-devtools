import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Record } from "@remote-platform/entity";

import { RecordService } from "./record.service";

@Module({
  imports: [TypeOrmModule.forFeature([Record])],
  providers: [RecordService],
  exports: [RecordService],
})
export class RecordModule {}
