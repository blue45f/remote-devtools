/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Logger, Module } from "@nestjs/common";

import { DomModule } from "../dom/dom.module";
import { NetworkModule } from "../network/network.module";
import { RecordModule } from "../record/record.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { S3Module } from "../s3/s3.module";
import { ScreenModule } from "../screen/screen.module";

import { WebviewController } from "./webview.controller";
import { WebviewGateway } from "./webview.gateway";

@Module({
  imports: [
    RecordModule,
    NetworkModule,
    DomModule,
    RuntimeModule,
    ScreenModule,
    S3Module,
  ],
  controllers: [WebviewController],
  providers: [WebviewGateway, Logger],
  exports: [WebviewGateway],
})
export class WebviewGatewayModule {}
