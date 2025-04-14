import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserEntity, DeviceInfoEntity } from "@remote-platform/entity";

import { FigmaController } from "./figma.controller";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, DeviceInfoEntity])],
  controllers: [FigmaController],
})
export class FigmaModule {}
