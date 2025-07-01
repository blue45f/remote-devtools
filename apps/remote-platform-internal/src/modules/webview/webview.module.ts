/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Logger, Module } from "@nestjs/common";

import { ServicesModule } from "@remote-platform/core";

import { S3Module } from "../s3/s3.module";

import { WebviewController } from "./webview.controller";
import { WebviewGateway } from "./webview.gateway";

@Module({
  imports: [ServicesModule, S3Module],
  controllers: [WebviewController],
  providers: [WebviewGateway, Logger],
  exports: [WebviewGateway],
})
export class WebviewGatewayModule {}
