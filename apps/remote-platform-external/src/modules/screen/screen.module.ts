import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ScreenEntity } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";

import { ScreenService } from "./screen.service";

@Module({
  imports: [TypeOrmModule.forFeature([ScreenEntity]), RecordModule],
  providers: [ScreenService],
  exports: [ScreenService],
})
export class ScreenModule {}
