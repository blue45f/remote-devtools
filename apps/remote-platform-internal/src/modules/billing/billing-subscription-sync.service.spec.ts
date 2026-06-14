import { describe, expect, it, vi } from 'vitest';

import { BillingSubscriptionSyncService } from './billing-subscription-sync.service';

import type { VerifiedBillingEvent } from './billing.types';
import type { OrganizationEntity } from '@remote-platform/entity';
import type { Repository, UpdateResult } from 'typeorm';

describe('BillingSubscriptionSyncService', () => {
  const makeService = () => {
    const repo = {
      update: vi.fn().mockResolvedValue({ affected: 1 } as UpdateResult),
    } as Pick<Repository<OrganizationEntity>, 'update'>;

    return {
      repo,
      service: new BillingSubscriptionSyncService(repo as Repository<OrganizationEntity>),
    };
  };

  it('updates the organization subscription fields from a subscription webhook event', async () => {
    const { repo, service } = makeService();
    const currentPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
    const event: VerifiedBillingEvent = {
      id: 'evt_123',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_123' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'pro',
        currentPeriodEnd,
      },
    };

    const result = await service.syncFromBillingEvent(event);

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'org_123' },
      {
        stripeCustomerId: 'cus_123',
        billingProvider: 'stripe',
        billingSubscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: currentPeriodEnd,
        plan: 'pro',
      },
    );
    expect(result).toEqual({
      action: 'updated',
      orgId: 'org_123',
      providerCustomerId: 'cus_123',
      affected: 1,
    });
  });

  it('does not clear plan when subscription webhook omits plan and is active', async () => {
    const { repo, service } = makeService();
    const currentPeriodEnd = new Date('2026-06-01T00:00:00.000Z');
    const event: VerifiedBillingEvent = {
      id: 'evt_789',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_789' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_789',
        status: 'active',
        plan: null,
        currentPeriodEnd,
      },
    };

    await service.syncFromBillingEvent(event);

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'org_123' },
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
        billingProvider: 'stripe',
        billingSubscriptionId: 'sub_789',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: currentPeriodEnd,
      }),
    );
    expect(repo.update).not.toHaveBeenCalledWith(
      { id: 'org_123' },
      expect.objectContaining({
        plan: expect.anything(),
      }),
    );
  });

  it('downgrades canceled subscriptions to the free plan', async () => {
    const { repo, service } = makeService();
    const event: VerifiedBillingEvent = {
      id: 'evt_456',
      type: 'customer.subscription.deleted',
      provider: 'stripe',
      raw: { id: 'evt_456' },
      subscription: {
        providerCustomerId: 'cus_456',
        providerSubscriptionId: 'sub_456',
        status: 'canceled',
      },
    };

    await service.syncFromBillingEvent(event);

    expect(repo.update).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_456' },
      expect.objectContaining({
        stripeCustomerId: 'cus_456',
        plan: 'free',
        subscriptionStatus: 'canceled',
      }),
    );
  });

  it('falls back to stripeCustomerId matching when orgId is blank', async () => {
    const { repo, service } = makeService();
    const event: VerifiedBillingEvent = {
      id: 'evt_no_org',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_no_org' },
      subscription: {
        providerCustomerId: 'cus_789',
        providerSubscriptionId: 'sub_789',
        status: 'active',
        orgId: '   ',
      },
    };

    await service.syncFromBillingEvent(event);

    expect(repo.update).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_789' },
      expect.objectContaining({
        stripeCustomerId: 'cus_789',
        billingSubscriptionId: 'sub_789',
        subscriptionStatus: 'active',
      }),
    );
  });

  it('ignores webhook events that do not carry subscription state', async () => {
    const { repo, service } = makeService();
    const event: VerifiedBillingEvent = {
      id: 'evt_789',
      type: 'invoice.payment_succeeded',
      provider: 'stripe',
      raw: { id: 'evt_789' },
    };

    const result = await service.syncFromBillingEvent(event);

    expect(repo.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: 'ignored',
      reason: 'subscription_state_not_present',
    });
  });

  it('ignores webhook events missing the provider customer id', async () => {
    const { repo, service } = makeService();
    const event: VerifiedBillingEvent = {
      id: 'evt_no_customer',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_no_customer' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: '',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    };

    const result = await service.syncFromBillingEvent(event);

    expect(repo.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: 'ignored',
      reason: 'missing_provider_customer_id',
    });
  });
});
