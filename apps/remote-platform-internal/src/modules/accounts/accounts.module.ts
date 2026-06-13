import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AccountEntity,
  OrganizationEntity,
  OrganizationMemberEntity,
} from '@remote-platform/entity';

import { AuthModule } from '../auth/auth.module';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AuthAccountsController } from './auth-accounts.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AccountEntity, OrganizationEntity, OrganizationMemberEntity]),
  ],
  controllers: [AccountsController, AuthAccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
