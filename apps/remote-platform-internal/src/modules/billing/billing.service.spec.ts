import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { OrganizationEntity, BillingWebhookEventEntity } from '@remote-platform/entity';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingService } from './billing.service';

import type { BillingSubscriptionSyncService } from './billing-subscription-sync.service';
import type { BillingProvider } from './billing.provider';
import type { Repository } from 'typeorm';

function makeQueryFailedError(code: string, detail?: string): QueryFailedError {
  const driverError = Object.assign(new Error(code), { code, detail });
  return new QueryFailedError('', [], driverError);
}

describe('BillingService', () => {
  const ORIGINAL = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = ORIGINAL;
  });

  it('reports disabled when STRIPE_SECRET_KEY is unset', () => {
    const svc = new BillingService();
    expect(svc.enabled).toBe(false);
  });

  it('reports enabled once STRIPE_SECRET_KEY is set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const svc = new BillingService();
    expect(svc.enabled).toBe(true);
  });

  it('returns provider-backed status with the public plan catalog', () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const svc = new BillingService(provider);

    expect(svc.getStatus()).toEqual({
      enabled: true,
      provider: 'stripe',
      plans: [
        { id: 'free', name: 'Free', monthly: 0 },
        { id: 'starter', name: 'Starter', monthly: 19 },
        { id: 'pro', name: 'Pro', monthly: 49 },
      ],
    });
  });

  it('throws ServiceUnavailable for checkout when disabled', async () => {
    const svc = new BillingService();
    await expect(
      svc.createCheckoutSession({
        priceId: 'price_x',
        orgId: 'o1',
        successUrl: 'https://x/success',
        cancelUrl: 'https://x/cancel',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws ServiceUnavailable for portal when disabled', async () => {
    const svc = new BillingService();
    await expect(
      svc.createPortalSession({
        orgId: 'org_x',
        returnUrl: 'https://x/return',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('requires organization repository wiring for portal creation', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const svc = new BillingService(provider, undefined, undefined, undefined);

    await expect(
      svc.createPortalSession({
        orgId: 'org_123',
        returnUrl: 'https://x/return',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('forwards portal session requests for org-based lookup when enabled', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn().mockResolvedValue({
        url: 'https://billing.stripe.test/portal/xyz',
      }),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        stripeCustomerId: 'cus_from_org',
      } as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    const result = await svc.createPortalSession({
      orgId: 'org_123',
      returnUrl: 'https://x/return',
    });

    expect(result).toEqual({ url: 'https://billing.stripe.test/portal/xyz' });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: [{ id: 'org_123' }, { slug: 'org_123' }],
    });
    expect(provider.createPortalSession).toHaveBeenCalledWith({
      customerId: 'cus_from_org',
      returnUrl: 'https://x/return',
    });
  });

  it('normalizes orgId before organization lookup', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn().mockResolvedValue({
        url: 'https://billing.stripe.test/portal/xyz',
      }),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        stripeCustomerId: 'cus_from_org',
      } as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    const result = await svc.createPortalSession({
      orgId: '  org_123  ',
      returnUrl: 'https://x/return',
    });

    expect(result).toEqual({ url: 'https://billing.stripe.test/portal/xyz' });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: [{ id: 'org_123' }, { slug: 'org_123' }],
    });
  });

  it('throws BadRequest for missing organization records during portal creation', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue(null),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    await expect(
      svc.createPortalSession({
        orgId: 'missing-org',
        returnUrl: 'https://x/return',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects blank orgId values for portal creation', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const svc = new BillingService(provider, undefined, {
      findOne: vi.fn(),
    } as unknown as Repository<OrganizationEntity>);

    await expect(
      svc.createPortalSession({
        orgId: '   ',
        returnUrl: 'https://x/return',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects portal access for orgs without Stripe customer IDs', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        id: 'org_123',
        slug: 'org_123',
      } as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    await expect(
      svc.createPortalSession({
        orgId: 'org_123',
        returnUrl: 'https://x/return',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves organization subscription state by id or slug', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce({
          plan: 'starter',
          stripeCustomerId: 'cus_1',
          billingProvider: 'stripe',
          billingSubscriptionId: 'sub_1',
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          plan: 'pro',
          stripeCustomerId: 'cus_2',
          billingProvider: 'stripe',
          billingSubscriptionId: 'sub_2',
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
        }),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    await expect(svc.getSubscriptionState('org_123')).resolves.toEqual({
      plan: 'starter',
      billingProvider: 'stripe',
      billingSubscriptionId: 'sub_1',
      subscriptionStatus: 'active',
      subscriptionCurrentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
    });
    await expect(svc.getSubscriptionState('tenant')).resolves.toEqual({
      plan: 'pro',
      billingProvider: 'stripe',
      billingSubscriptionId: 'sub_2',
      subscriptionStatus: 'active',
      subscriptionCurrentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(repository.findOne).toHaveBeenNthCalledWith(1, {
      where: [{ id: 'org_123' }, { slug: 'org_123' }],
    });
  });

  it('normalizes orgId before subscription state lookup', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        plan: 'free',
      } as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    const result = await svc.getSubscriptionState('  org_123  ');
    expect(result.plan).toBe('free');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: [{ id: 'org_123' }, { slug: 'org_123' }],
    });
  });

  it('returns null-valued billing fields as null', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        plan: 'starter',
      } as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    const result = await svc.getSubscriptionState('org_123');

    expect(result).toEqual({
      plan: 'starter',
      billingProvider: null,
      billingSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionCurrentPeriodEnd: null,
    });
  });

  it('normalizes invalid plan records to the free tier', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        plan: 'invalid',
      } as unknown as OrganizationEntity),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    const result = await svc.getSubscriptionState('org_123');

    expect(result.plan).toBe('free');
  });

  it('throws ServiceUnavailable when organization repository is missing for subscription state', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const svc = new BillingService(provider, undefined, undefined, undefined);

    await expect(svc.getSubscriptionState('org_123')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws BadRequest for blank orgId when loading subscription state', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn(),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    await expect(svc.getSubscriptionState('   ')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('throws BadRequest when organization is not found for subscription state', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue(null),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const svc = new BillingService(
      provider,
      undefined,
      repository as Repository<OrganizationEntity>,
    );

    await expect(svc.getSubscriptionState('org_missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws ServiceUnavailable for webhook when disabled', async () => {
    const svc = new BillingService();
    await expect(
      svc.handleWebhook({
        rawBody: Buffer.from('{}'),
        signature: 't=1,v1=abc',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('delegates checkout creation to the configured provider once enabled', async () => {
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn().mockResolvedValue({
        url: 'https://checkout.stripe.test/session',
      }),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
    };
    const svc = new BillingService(provider);

    await expect(
      svc.createCheckoutSession({
        priceId: 'price_x',
        orgId: 'o1',
        successUrl: 'https://x/success',
        cancelUrl: 'https://x/cancel',
      }),
    ).resolves.toEqual({ url: 'https://checkout.stripe.test/session' });
  });

  it('verifies webhook payloads through the provider and syncs subscription events', async () => {
    const event = {
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
        currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockResolvedValue({
        action: 'updated',
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        affected: 1,
      }),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const svc = new BillingService(provider, sync as BillingSubscriptionSyncService);

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_123',
    });

    expect(provider.verifyWebhook).toHaveBeenCalledWith({
      rawBody: Buffer.from('payload'),
      signature: 'sig_123',
    });
    expect(sync.syncFromBillingEvent).toHaveBeenCalledWith(event);
    expect(result).toEqual({
      event,
      sync: {
        action: 'updated',
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        affected: 1,
      },
    });
  });

  it('skips webhook processing when same event was already handled', async () => {
    const event = {
      id: 'evt_dup',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_dup' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn(),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockImplementation(() => {
        const error = makeQueryFailedError('23505');
        throw error;
      }),
      findOne: vi.fn().mockResolvedValue(null),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert' | 'findOne'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_dup',
    });

    expect(result.sync).toEqual({
      action: 'ignored',
      reason: 'duplicate_event',
    });
    expect(sync.syncFromBillingEvent).not.toHaveBeenCalled();
    expect(webhookRepository.insert).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_dup',
      providerEventType: 'customer.subscription.updated',
    });
  });

  it('treats duplicate webhook as duplicate when stale check cannot read reservation metadata', async () => {
    const event = {
      id: 'evt_dup_lookup_fail',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_dup_lookup_fail' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn(),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockImplementation(() => {
        const error = makeQueryFailedError('23505');
        throw error;
      }),
      findOne: vi.fn().mockRejectedValue(new Error('read failed')),
      delete: vi.fn().mockResolvedValue({ affected: 0 }),
    } as Pick<Repository<BillingWebhookEventEntity>, 'delete' | 'findOne' | 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_dup_lookup_fail',
    });

    expect(result.sync).toEqual({
      action: 'ignored',
      reason: 'duplicate_event',
    });
    expect(sync.syncFromBillingEvent).not.toHaveBeenCalled();
    expect(webhookRepository.delete).toHaveBeenCalledWith({
      receivedAt: expect.any(Object),
    });
    expect(webhookRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it('does not retry stale cleanup when reservation timestamp is invalid', async () => {
    const event = {
      id: 'evt_invalid_reservation_time',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_invalid_reservation_time' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn(),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockImplementation(() => {
        const error = makeQueryFailedError('23505');
        throw error;
      }),
      findOne: vi.fn().mockResolvedValue({
        receivedAt: new Date('invalid-date'),
      }),
      delete: vi.fn().mockResolvedValue({ affected: 0 }),
    } as Pick<Repository<BillingWebhookEventEntity>, 'delete' | 'findOne' | 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_invalid_reservation_time',
    });

    expect(result.sync).toEqual({
      action: 'ignored',
      reason: 'duplicate_event',
    });
    expect(sync.syncFromBillingEvent).not.toHaveBeenCalled();
    expect(webhookRepository.delete).toHaveBeenCalledWith({
      receivedAt: expect.any(Object),
    });
  });

  it('retries once after clearing stale webhook reservation', async () => {
    const event = {
      id: 'evt_stale',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_stale' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'pro',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockResolvedValue({
        action: 'updated',
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        affected: 1,
      }),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;

    let insertAttempt = 0;
    const webhookRepository = {
      insert: vi.fn().mockImplementation(() => {
        insertAttempt++;
        if (insertAttempt === 1) {
          const error = makeQueryFailedError('23505');
          throw error;
        }
        return undefined;
      }),
      findOne: vi.fn().mockResolvedValue({
        receivedAt: new Date(Date.now() - 901_000),
      }),
      delete: vi.fn().mockResolvedValue(undefined),
    } as Pick<Repository<BillingWebhookEventEntity>, 'delete' | 'findOne' | 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_stale',
    });

    expect(result.sync).toEqual({
      action: 'updated',
      orgId: 'org_123',
      providerCustomerId: 'cus_123',
      affected: 1,
    });
    expect(sync.syncFromBillingEvent).toHaveBeenCalledWith(event);
    expect(insertAttempt).toBe(2);
    expect(webhookRepository.insert).toHaveBeenCalledTimes(2);
    expect(webhookRepository.findOne).toHaveBeenCalledTimes(1);
    expect(webhookRepository.delete).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_stale',
    });
  });

  it('processes webhook once then persists event dedupe marker', async () => {
    const event = {
      id: 'evt_once',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_once' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'pro',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockResolvedValue({
        action: 'updated',
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        affected: 1,
      }),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockResolvedValue(undefined),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_once',
    });

    expect(result.sync).toEqual({
      action: 'updated',
      orgId: 'org_123',
      providerCustomerId: 'cus_123',
      affected: 1,
    });
    expect(sync.syncFromBillingEvent).toHaveBeenCalledWith(event);
    expect(webhookRepository.insert).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_once',
      providerEventType: 'customer.subscription.updated',
    });
  });

  it('returns subscription_state_not_present when sync service is not configured', async () => {
    const event = {
      id: 'evt_no_sync',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_no_sync' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const webhookRepository = {
      insert: vi.fn().mockResolvedValue(undefined),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert'>;
    const svc = new BillingService(
      provider,
      undefined,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_no_sync',
    });

    expect(result).toEqual({
      event,
      sync: {
        action: 'ignored',
        reason: 'subscription_state_not_present',
      },
    });
  });

  it('continues webhook processing when stale reservation cleanup fails', async () => {
    const event = {
      id: 'evt_cleanup_failed',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_cleanup_failed' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockResolvedValue({
        action: 'updated',
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        affected: 1,
      }),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockRejectedValue(new Error('cleanup failed')),
      findOne: vi.fn(),
    } as Pick<Repository<BillingWebhookEventEntity>, 'delete' | 'findOne' | 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    const result = await svc.handleWebhook({
      rawBody: Buffer.from('payload'),
      signature: 'sig_cleanup_failed',
    });

    expect(result.sync).toEqual({
      action: 'updated',
      orgId: 'org_123',
      providerCustomerId: 'cus_123',
      affected: 1,
    });
    expect(webhookRepository.insert).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_cleanup_failed',
      providerEventType: 'customer.subscription.updated',
    });
    expect(webhookRepository.delete).toHaveBeenCalled();
  });

  it('runs webhook reservation cleanup only when interval has elapsed', async () => {
    vi.useFakeTimers();
    try {
      const startedAt = new Date('2026-01-01T00:00:00.000Z').getTime();
      vi.setSystemTime(startedAt);

      const events = [
        {
          id: 'evt_interval_1',
          type: 'customer.subscription.updated',
          provider: 'stripe',
          raw: { id: 'evt_interval_1' },
          subscription: {
            orgId: 'org_123',
            providerCustomerId: 'cus_123',
            providerSubscriptionId: 'sub_1',
            status: 'active',
            plan: 'pro',
          },
        } as const,
        {
          id: 'evt_interval_2',
          type: 'customer.subscription.updated',
          provider: 'stripe',
          raw: { id: 'evt_interval_2' },
          subscription: {
            orgId: 'org_123',
            providerCustomerId: 'cus_123',
            providerSubscriptionId: 'sub_2',
            status: 'active',
            plan: 'pro',
          },
        } as const,
        {
          id: 'evt_interval_3',
          type: 'customer.subscription.updated',
          provider: 'stripe',
          raw: { id: 'evt_interval_3' },
          subscription: {
            orgId: 'org_123',
            providerCustomerId: 'cus_123',
            providerSubscriptionId: 'sub_3',
            status: 'active',
            plan: 'pro',
          },
        } as const,
      ];

      const provider = {
        id: 'stripe' as const,
        enabled: true,
        createCheckoutSession: vi.fn(),
        createPortalSession: vi.fn(),
        verifyWebhook: vi
          .fn()
          .mockResolvedValueOnce(events[0])
          .mockResolvedValueOnce(events[1])
          .mockResolvedValueOnce(events[2]),
      };

      const sync = {
        syncFromBillingEvent: vi.fn().mockResolvedValue({
          action: 'updated',
          orgId: 'org_123',
          affected: 1,
          providerCustomerId: 'cus_123',
        }),
      } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;

      const webhookRepository = {
        insert: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue({ affected: 0 }),
      } as Pick<Repository<BillingWebhookEventEntity>, 'insert' | 'delete'>;

      const svc = new BillingService(
        provider,
        sync as BillingSubscriptionSyncService,
        undefined,
        webhookRepository as Repository<BillingWebhookEventEntity>,
      );

      await svc.handleWebhook({
        rawBody: Buffer.from('payload-1'),
        signature: 'sig_1',
      });
      expect(webhookRepository.delete).toHaveBeenCalledTimes(1);

      vi.setSystemTime(startedAt + 30_000);
      await svc.handleWebhook({
        rawBody: Buffer.from('payload-2'),
        signature: 'sig_2',
      });
      expect(webhookRepository.delete).toHaveBeenCalledTimes(1);

      vi.setSystemTime(startedAt + 61_000);
      await svc.handleWebhook({
        rawBody: Buffer.from('payload-3'),
        signature: 'sig_3',
      });
      expect(webhookRepository.delete).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rethrows unknown webhook persistence failures', async () => {
    const event = {
      id: 'evt_error',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_error' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn(),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockImplementation(() => {
        const error = makeQueryFailedError('42601', 'syntax error');
        throw error;
      }),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    await expect(
      svc.handleWebhook({
        rawBody: Buffer.from('payload'),
        signature: 'sig_error',
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
    expect(sync.syncFromBillingEvent).not.toHaveBeenCalled();
    expect(webhookRepository.insert).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_error',
      providerEventType: 'customer.subscription.updated',
    });
  });

  it('clears webhook reservation when sync processing fails, allowing retry', async () => {
    const event = {
      id: 'evt_sync_fail',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_sync_fail' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockRejectedValue(new Error('sync failed')),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert' | 'delete'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    await expect(
      svc.handleWebhook({
        rawBody: Buffer.from('payload'),
        signature: 'sig_fail',
      }),
    ).rejects.toThrow('sync failed');
    expect(sync.syncFromBillingEvent).toHaveBeenCalledWith(event);
    expect(webhookRepository.delete).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_sync_fail',
    });
    expect(webhookRepository.insert).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_sync_fail',
      providerEventType: 'customer.subscription.updated',
    });
  });

  it('does not mask sync errors when reservation cleanup fails', async () => {
    const event = {
      id: 'evt_sync_fail_cleanup',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: { id: 'evt_sync_fail_cleanup' },
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      },
    } as const;
    const provider: BillingProvider = {
      id: 'stripe',
      enabled: true,
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn().mockResolvedValue(event),
    };
    const sync = {
      syncFromBillingEvent: vi.fn().mockRejectedValue(new Error('sync failed')),
    } as Pick<BillingSubscriptionSyncService, 'syncFromBillingEvent'>;
    const webhookRepository = {
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockRejectedValue(new Error('cleanup failed')),
    } as Pick<Repository<BillingWebhookEventEntity>, 'insert' | 'delete'>;

    const svc = new BillingService(
      provider,
      sync as BillingSubscriptionSyncService,
      undefined,
      webhookRepository as Repository<BillingWebhookEventEntity>,
    );

    await expect(
      svc.handleWebhook({
        rawBody: Buffer.from('payload'),
        signature: 'sig_cleanup_fail',
      }),
    ).rejects.toThrow('sync failed');
    expect(webhookRepository.delete).toHaveBeenCalledWith({
      provider: 'stripe',
      providerEventId: 'evt_sync_fail_cleanup',
    });
  });
});
