import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingWebhookEventEntity, OrganizationEntity } from '@remote-platform/entity';

import { AuthModule } from '../auth/auth.module';

import { BillingSubscriptionSyncService } from './billing-subscription-sync.service';
import { BillingController } from './billing.controller';
import { BILLING_PROVIDER, StripeBillingProvider } from './billing.provider';
import { BillingService } from './billing.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([OrganizationEntity, BillingWebhookEventEntity])],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingSubscriptionSyncService,
    {
      provide: BILLING_PROVIDER,
      useFactory: () => new StripeBillingProvider(),
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
