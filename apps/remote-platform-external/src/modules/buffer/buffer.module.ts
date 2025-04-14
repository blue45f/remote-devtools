import { Module } from "@nestjs/common";

import { BufferService } from "./buffer.service";

@Module({
  providers: [BufferService],
  exports: [BufferService],
})
export class BufferModule {}
