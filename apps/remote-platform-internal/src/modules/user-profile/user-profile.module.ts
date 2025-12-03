import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DeviceInfoEntity,
      UserTicketTemplateEntity,
    ]),
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}
