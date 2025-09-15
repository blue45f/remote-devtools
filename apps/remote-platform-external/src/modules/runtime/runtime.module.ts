import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RuntimeEntity } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";

import { RuntimeService } from "./runtime.service";

@Module({
  imports: [TypeOrmModule.forFeature([RuntimeEntity]), RecordModule],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
