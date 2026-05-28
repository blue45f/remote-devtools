import { createHmac } from 'crypto';

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StripeBillingProvider } from './billing.provider';

describe('StripeBillingProvider', () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalProPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const originalAllowedReturnOrigins = process.env.BILLING_ALLOWED_RETURN_ORIGINS;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalSecret;
    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    }
    if (originalProPriceId === undefined) {
      delete process.env.STRIPE_PRO_PRICE_ID;
    } else {
      process.env.STRIPE_PRO_PRICE_ID = originalProPriceId;
    }
    if (originalAllowedReturnOrigins === undefined) {
      delete process.env.BILLING_ALLOWED_RETURN_ORIGINS;
    } else {
      process.env.BILLING_ALLOWED_RETURN_ORIGINS = originalAllowedReturnOrigins;
    }
  });

  const sign = (payload: string, timestamp = Math.floor(Date.now() / 1000)) => {
    const signature = createHmac('sha256', 'whsec_test')
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  };

  it('creates a subscription Checkout Session with org metadata', async () => {
    const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
    });

    const result = await provider.createCheckoutSession({
      priceId: 'price_pro',
      orgId: 'org_123',
      successUrl: 'https://app.example.com/billing/success',
      cancelUrl: 'https://app.example.com/billing/cancel',
    });

    expect(create).toHaveBeenCalledWith({
      mode: 'subscription',
      line_items: [{ price: 'price_pro', quantity: 1 }],
      success_url: 'https://app.example.com/billing/success',
      cancel_url: 'https://app.example.com/billing/cancel',
      client_reference_id: 'org_123',
      allow_promotion_codes: true,
      metadata: {
        orgId: 'org_123',
        priceId: 'price_pro',
        plan: 'pro',
      },
      subscription_data: {
        metadata: {
          orgId: 'org_123',
          priceId: 'price_pro',
          plan: 'pro',
        },
      },
    });
    expect(result).toEqual({ url: 'https://checkout.stripe.test/session' });
  });

  it('creates a short-lived Customer Portal Session for an existing customer', async () => {
    const create = vi.fn().mockResolvedValue({ url: 'https://billing.stripe.test/session' });
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create } },
      webhooks: { constructEvent: vi.fn() },
    });

    const result = await provider.createPortalSession({
      customerId: 'cus_123',
      returnUrl: 'https://app.example.com/settings/billing',
    });

    expect(create).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://app.example.com/settings/billing',
    });
    expect(result).toEqual({ url: 'https://billing.stripe.test/session' });
  });

  it('rejects portal return URL not allowed by BILLING_ALLOWED_RETURN_ORIGINS', async () => {
    process.env.BILLING_ALLOWED_RETURN_ORIGINS = 'https://allowed.test';
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            url: 'https://billing.stripe.test/session',
          }),
        },
      },
      webhooks: { constructEvent: vi.fn() },
    });

    await expect(
      provider.createPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://not-allowed.test/settings/billing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts allowed portal return URL origins from BILLING_ALLOWED_RETURN_ORIGINS', async () => {
    process.env.BILLING_ALLOWED_RETURN_ORIGINS = 'https://allowed.test';
    const create = vi.fn().mockResolvedValue({
      url: 'https://billing.stripe.test/session',
    });
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create } },
      webhooks: { constructEvent: vi.fn() },
    });

    await provider.createPortalSession({
      customerId: 'cus_123',
      returnUrl: 'https://allowed.test/settings/billing',
    });

    expect(create).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://allowed.test/settings/billing',
    });
  });

  it('fails closed when Stripe does not return a session URL', async () => {
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create: vi.fn().mockResolvedValue({}) } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
    });

    await expect(
      provider.createCheckoutSession({
        priceId: 'price_pro',
        orgId: 'org_123',
        successUrl: 'https://app.example.com/billing/success',
        cancelUrl: 'https://app.example.com/billing/cancel',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects unsafe redirect URLs before calling Stripe', async () => {
    const create = vi.fn();
    const provider = new StripeBillingProvider({
      checkout: { sessions: { create } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
    });

    await expect(
      provider.createCheckoutSession({
        priceId: 'price_pro',
        orgId: 'org_123',
        successUrl: 'javascript:alert(1)',
        cancelUrl: 'https://app.example.com/billing/cancel',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('verifies Stripe-style signatures and extracts subscription state', async () => {
    const payload = JSON.stringify({
      id: 'evt_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_123',
          id: 'sub_123',
          status: 'active',
          current_period_end: 1_800_086_400,
          metadata: { orgId: 'org_123', plan: 'pro' },
        },
      },
    });

    const event = await new StripeBillingProvider().verifyWebhook({
      rawBody: Buffer.from(payload),
      signature: sign(payload),
    });

    expect(event).toEqual({
      id: 'evt_123',
      type: 'customer.subscription.updated',
      provider: 'stripe',
      raw: expect.any(Object),
      subscription: {
        orgId: 'org_123',
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        status: 'active',
        plan: 'pro',
        currentPeriodEnd: new Date('2027-01-16T08:00:00.000Z'),
      },
    });
  });

  it('extracts customer IDs from expanded customer objects in webhooks', async () => {
    const payload = JSON.stringify({
      id: 'evt_456',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: { id: 'cus_obj_456' },
          id: 'sub_456',
          status: 'canceled',
          items: {
            data: [
              {
                price: {
                  id: 'price_unsupported',
                },
              },
            ],
          },
          metadata: {},
          current_period_end: '2026-12-31T23:59:59.000Z',
        },
      },
    });

    const event = await new StripeBillingProvider().verifyWebhook({
      rawBody: Buffer.from(payload),
      signature: sign(payload),
    });

    expect(event).toEqual({
      id: 'evt_456',
      type: 'customer.subscription.deleted',
      provider: 'stripe',
      raw: expect.any(Object),
      subscription: {
        orgId: null,
        providerCustomerId: 'cus_obj_456',
        providerSubscriptionId: 'sub_456',
        status: 'canceled',
        plan: null,
        currentPeriodEnd: new Date('2026-12-31T23:59:59.000Z'),
      },
    });
  });

  it('parses webhook current_period_end when supplied as a numeric string', async () => {
    const payload = JSON.stringify({
      id: 'evt_789',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_789',
          id: 'sub_789',
          metadata: { orgId: 'org_789' },
          current_period_end: String(1_800_086_400),
        },
      },
    });

    const event = await new StripeBillingProvider().verifyWebhook({
      rawBody: Buffer.from(payload),
      signature: sign(payload),
    });

    expect(event.subscription?.currentPeriodEnd).toEqual(new Date('2027-01-16T08:00:00.000Z'));
  });

  it('rejects invalid webhook signatures', async () => {
    await expect(
      new StripeBillingProvider().verifyWebhook({
        rawBody: Buffer.from('{}'),
        signature: 't=1,v1=bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires STRIPE_WEBHOOK_SECRET before verifying webhooks', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await expect(
      new StripeBillingProvider().verifyWebhook({
        rawBody: Buffer.from('{}'),
        signature: 't=1,v1=bad',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
