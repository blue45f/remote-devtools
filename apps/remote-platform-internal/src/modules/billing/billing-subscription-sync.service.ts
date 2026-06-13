import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationEntity } from '@remote-platform/entity';

import type { BillingSyncResult, VerifiedBillingEvent } from './billing.types';
import type { DeepPartial, Repository } from 'typeorm';

@Injectable()
export class BillingSubscriptionSyncService {
  private readonly logger = new Logger(BillingSubscriptionSyncService.name);

  public constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  public async syncFromBillingEvent(event: VerifiedBillingEvent): Promise<BillingSyncResult> {
    const subscription = event.subscription;
    if (!subscription) {
      return {
        action: 'ignored',
        reason: 'subscription_state_not_present',
      };
    }

    if (!subscription.providerCustomerId) {
      return {
        action: 'ignored',
        reason: 'missing_provider_customer_id',
      };
    }

    const patch: DeepPartial<OrganizationEntity> = {
      stripeCustomerId: subscription.providerCustomerId,
      billingProvider: event.provider,
      billingSubscriptionId: subscription.providerSubscriptionId ?? null,
      subscriptionStatus: subscription.status ?? null,
      subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd ?? null,
    };

    if (subscription.plan) {
      patch.plan = subscription.plan;
    } else if (subscription.status === 'canceled') {
      patch.plan = 'free';
    }

    const normalizedOrgId = subscription.orgId?.trim();

    const criteria = normalizedOrgId
      ? { id: normalizedOrgId }
      : { stripeCustomerId: subscription.providerCustomerId };
    const result = await this.organizationRepository.update(criteria, patch);
    const affected = result.affected ?? 0;
    if (affected === 0) {
      this.logger.warn(
        `[BILLING_SYNC_MISS] No organization found for providerCustomerId=${subscription.providerCustomerId}`,
      );
    }

    return {
      action: 'updated',
      orgId: subscription.orgId ?? null,
      providerCustomerId: subscription.providerCustomerId,
      affected,
    };
  }
}
