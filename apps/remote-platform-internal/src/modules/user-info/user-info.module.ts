import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

import { UserInfoService } from "./user-info.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DeviceInfoEntity,
      UserTicketTemplateEntity,
    ]),
  ],
  providers: [UserInfoService],
  exports: [UserInfoService],
})
export class UserInfoModule {}
