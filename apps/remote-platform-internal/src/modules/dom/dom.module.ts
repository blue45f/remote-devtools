import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DomEntity } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";

import { DomService } from "./dom.service";

@Module({
  imports: [TypeOrmModule.forFeature([DomEntity]), RecordModule],
  providers: [DomService],
  exports: [DomService],
})
export class DomModule {}
