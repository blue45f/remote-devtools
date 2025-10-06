import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RecordEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity])],
  providers: [RecordService],
  exports: [RecordService],
})
export class RecordModule {}
