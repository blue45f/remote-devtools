import { Module } from "@nestjs/common";

import { ImageBase64Controller } from "./imageBase64.controller";
import { ImageBase64Service } from "./imageBase64.service";

@Module({
  controllers: [ImageBase64Controller],
  providers: [ImageBase64Service],
})
export class ImageBase64Module {}
