import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Network } from "@remote-platform/entity";

import { RecordModule } from "../record/record.module";

import { NetworkService } from "./network.service";

@Module({
  imports: [TypeOrmModule.forFeature([Network]), RecordModule],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
