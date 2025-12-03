import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Screen } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";

import { ScreenService } from "./screen.service";

@Module({
  imports: [TypeOrmModule.forFeature([Screen]), RecordModule],
  providers: [ScreenService],
  exports: [ScreenService],
})
export class ScreenModule {}
