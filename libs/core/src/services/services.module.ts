import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  DomEntity,
  NetworkEntity,
  RecordEntity,
  RuntimeEntity,
  ScreenEntity,
} from "@remote-platform/entity";

import { DomService } from "./dom.service";
import { ImageBase64Service } from "./image-base64.service";
import { NetworkService } from "./network.service";
import { RecordService } from "./record.service";
import { RuntimeService } from "./runtime.service";
import { ScreenService } from "./screen.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordEntity,
      NetworkEntity,
      DomEntity,
      RuntimeEntity,
      ScreenEntity,
    ]),
  ],
  providers: [
    RecordService,
    NetworkService,
    DomService,
    RuntimeService,
    ScreenService,
    ImageBase64Service,
  ],
  exports: [
    RecordService,
    NetworkService,
    DomService,
    RuntimeService,
    ScreenService,
    ImageBase64Service,
    TypeOrmModule,
  ],
})
export class ServicesModule {}
