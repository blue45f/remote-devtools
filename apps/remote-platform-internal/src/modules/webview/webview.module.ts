import { Logger, Module } from "@nestjs/common";

import { ServicesModule } from "@remote-platform/core";

import { AuthModule } from "../auth/auth.module";
import { S3Module } from "../s3/s3.module";

import { ObjectReconstructionService } from "./object-reconstruction.service";
import { S3PlaybackService } from "./s3-playback.service";
import { WebviewController } from "./webview.controller";
import { WebviewGateway } from "./webview.gateway";

@Module({
  imports: [ServicesModule, S3Module, AuthModule],
  controllers: [WebviewController],
  providers: [
    WebviewGateway,
    ObjectReconstructionService,
    S3PlaybackService,
    Logger,
  ],
  exports: [WebviewGateway],
})
export class WebviewGatewayModule {}
