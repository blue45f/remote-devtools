import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

import { UserInfoModule } from "../user-info/user-info.module";

import { TicketFormController } from "./ticket-form.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DeviceInfoEntity,
      UserTicketTemplateEntity,
    ]),
    UserInfoModule,
  ],
  controllers: [TicketFormController],
  exports: [],
})
export class TicketFormModule {}
