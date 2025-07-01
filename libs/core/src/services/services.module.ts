import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  Dom,
  Network,
  Record,
  Runtime,
  Screen,
} from "@remote-platform/entity";

import { DomService } from "./dom.service";
import { NetworkService } from "./network.service";
import { RecordService } from "./record.service";
import { RuntimeService } from "./runtime.service";
import { ScreenService } from "./screen.service";

@Module({
  imports: [TypeOrmModule.forFeature([Record, Network, Dom, Runtime, Screen])],
  providers: [
    RecordService,
    NetworkService,
    DomService,
    RuntimeService,
    ScreenService,
  ],
  exports: [
    RecordService,
    NetworkService,
    DomService,
    RuntimeService,
    ScreenService,
    TypeOrmModule,
  ],
})
export class ServicesModule {}
