import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ServicesModule } from "@remote-platform/core";
import {
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  ScreenEntity,
  RecordEntity,
  DomEntity,
} from "@remote-platform/entity";

import { BufferModule } from "../buffer/buffer.module";
import { JiraModule } from "../jira/jira.module";
import { S3Module } from "../s3/s3.module";
import { SlackModule } from "../slack/slack.module";
import { UserInfoModule } from "../user-info/user-info.module";

import { BufferController } from "./buffer.controller";
import { BufferFlushService } from "./buffer-flush.service";
import { CdpEventPersistenceService } from "./cdp-event-persistence.service";
import { WebviewController } from "./webview.controller";
import { WebviewGateway } from "./webview.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketLogEntity,
      TicketComponentEntity,
      TicketLabelEntity,
      ScreenEntity,
      RecordEntity,
      DomEntity,
    ]),
    ServicesModule,
    BufferModule,
    S3Module,
    JiraModule,
    SlackModule,
    UserInfoModule,
  ],
  controllers: [WebviewController, BufferController],
  providers: [
    WebviewGateway,
    CdpEventPersistenceService,
    BufferFlushService,
    Logger,
  ],
  exports: [WebviewGateway],
})
export class WebviewGatewayModule {}
