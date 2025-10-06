import { Module } from "@nestjs/common";

import { ServicesModule } from "@remote-platform/core";

import { ImageBase64Controller } from "./image-base64.controller";

@Module({
  imports: [ServicesModule],
  controllers: [ImageBase64Controller],
})
export class ImageBase64Module {}
