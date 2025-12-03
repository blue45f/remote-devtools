import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  Screen,
  Record,
  Dom,
} from "@remote-platform/entity";

import { BufferModule } from "../buffer/buffer.module";
import { DomModule } from "../dom/dom.module";
import { JiraModule } from "../jira/jira.module";
import { NetworkModule } from "../network/network.module";
import { RecordModule } from "../record/record.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { S3Module } from "../s3/s3.module";
import { ScreenModule } from "../screen/screen.module";
import { SlackModule } from "../slack/slack.module";
import { UserInfoModule } from "../user-info/user-info.module";

import { BufferController } from "./buffer.controller";
import { WebviewController } from "./webview.controller";
import { WebviewGateway } from "./webview.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketLogEntity,
      TicketComponentEntity,
      TicketLabelEntity,
      Screen,
      Record,
      Dom,
    ]),
    RecordModule,
    NetworkModule,
    DomModule,
    RuntimeModule,
    ScreenModule,
    BufferModule,
    S3Module,
    JiraModule,
    SlackModule,
    UserInfoModule,
  ],
  controllers: [WebviewController, BufferController],
  providers: [WebviewGateway, Logger],
  exports: [WebviewGateway],
})
export class WebviewGatewayModule {}
