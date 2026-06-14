import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, OrganizationMemberEntity } from '@remote-platform/entity';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PlanGuard } from './plan.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, OrganizationMemberEntity])],
  controllers: [AuthController],
  providers: [AuthService, PlanGuard],
  exports: [AuthService, PlanGuard],
})
export class AuthModule {}
