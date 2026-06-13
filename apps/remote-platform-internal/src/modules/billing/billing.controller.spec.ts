import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingController } from './billing.controller';

import type { BillingService } from './billing.service';
import type { AuthClaims } from '../auth/auth.service';
import type { Request } from 'express';

describe('BillingController', () => {
  let mockBilling: {
    enabled: boolean;
    getStatus: ReturnType<typeof vi.fn>;
    getSubscriptionState: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
    createPortalSession: ReturnType<typeof vi.fn>;
    handleWebhook: ReturnType<typeof vi.fn>;
  };
  let controller: BillingController;

  beforeEach(() => {
    mockBilling = {
      enabled: true,
      getStatus: vi.fn().mockReturnValue({
        enabled: true,
        provider: 'stripe',
        plans: [
          { id: 'free', name: 'Free', monthly: 0 },
          { id: 'starter', name: 'Starter', monthly: 19 },
          { id: 'pro', name: 'Pro', monthly: 49 },
        ],
      }),
      getSubscriptionState: vi.fn().mockResolvedValue({
        plan: 'pro',
        billingProvider: 'stripe',
        billingSubscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date('2026-12-31T23:59:59.000Z'),
      }),
      createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://stripe.test/checkout/abc' }),
      createPortalSession: vi.fn().mockResolvedValue({ url: 'https://stripe.test/portal/xyz' }),
      handleWebhook: vi.fn().mockResolvedValue({
        event: {
          id: 'evt_123',
          type: 'customer.subscription.updated',
          provider: 'stripe',
          raw: {},
        },
        sync: { action: 'ignored', reason: 'missing_provider_customer_id' },
      }),
    };
    controller = new BillingController(mockBilling as unknown as BillingService);
  });

  describe('status', () => {
    it('returns { enabled: false } when billing is disabled', () => {
      mockBilling.getStatus.mockReturnValueOnce({ enabled: false });
      expect(controller.status()).toEqual({ enabled: false });
    });

    it('returns enabled + plans list when billing is enabled', () => {
      mockBilling.enabled = true;
      const result = controller.status();
      expect(result).toEqual({
        enabled: true,
        provider: 'stripe',
        plans: [
          { id: 'free', name: 'Free', monthly: 0 },
          { id: 'starter', name: 'Starter', monthly: 19 },
          { id: 'pro', name: 'Pro', monthly: 49 },
        ],
      });
    });
  });

  describe('subscription', () => {
    it('returns a normalized subscription snapshot for the authenticated org', async () => {
      const claims = { sub: 'u-1', org: 'org_123' } as AuthClaims;
      const result = await controller.subscription(claims);

      expect(result).toEqual({
        plan: 'pro',
        billingProvider: 'stripe',
        billingSubscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date('2026-12-31T23:59:59.000Z'),
      });
      expect(mockBilling.getSubscriptionState).toHaveBeenCalledWith('org_123');
    });

    it('rejects requests without authenticated org context', async () => {
      await expect(controller.subscription(null)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkout', () => {
    const validBody = {
      priceId: 'price_123',
      successUrl: 'https://app.test/ok',
      cancelUrl: 'https://app.test/cancel',
    };

    it("uses 'anonymous' as orgId when no auth claims are present", async () => {
      const result = await controller.checkout(null, validBody);
      expect(result).toEqual({ url: 'https://stripe.test/checkout/abc' });
      expect(mockBilling.createCheckoutSession).toHaveBeenCalledWith({
        priceId: 'price_123',
        orgId: 'anonymous',
        successUrl: 'https://app.test/ok',
        cancelUrl: 'https://app.test/cancel',
      });
    });

    it('uses auth.org as orgId when claims include it', async () => {
      const claims = { sub: 'u-1', org: 'org-42' } as AuthClaims;
      await controller.checkout(claims, validBody);
      expect(mockBilling.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-42' }),
      );
    });

    it('propagates service errors (e.g. 503 when billing is disabled)', async () => {
      mockBilling.createCheckoutSession.mockRejectedValueOnce(
        new ServiceUnavailableException('Billing is disabled'),
      );
      await expect(controller.checkout(null, validBody)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('portal', () => {
    const validBody = {
      returnUrl: 'https://app.test/account',
    };

    it('requires an authenticated org context', async () => {
      await expect(controller.portal(null, validBody)).rejects.toThrow(BadRequestException);
    });

    it('returns the portal URL on the happy path', async () => {
      const claims = { sub: 'u-1', org: 'org_123' } as AuthClaims;
      const result = await controller.portal(claims, validBody);
      expect(result).toEqual({ url: 'https://stripe.test/portal/xyz' });
      expect(mockBilling.createPortalSession).toHaveBeenCalledWith({
        orgId: 'org_123',
        returnUrl: 'https://app.test/account',
      });
    });

    it('propagates service errors (e.g. 503 when billing is disabled)', async () => {
      const claims = { sub: 'u-1', org: 'org_123' } as AuthClaims;
      mockBilling.createPortalSession.mockRejectedValueOnce(
        new ServiceUnavailableException('Billing is disabled'),
      );
      await expect(controller.portal(claims, validBody)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('webhook', () => {
    const makeReq = (rawBody?: Buffer): Request => ({ rawBody }) as unknown as Request;

    it('throws ServiceUnavailableException when billing is disabled', async () => {
      mockBilling.enabled = false;
      await expect(controller.webhook(makeReq(Buffer.from('{}')), 'sig')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws BadRequestException when stripe-signature header is missing', async () => {
      await expect(controller.webhook(makeReq(Buffer.from('{}')), undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when rawBody is missing', async () => {
      await expect(controller.webhook(makeReq(undefined), 'sig')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('verifies and returns { received, type } on the happy path', async () => {
      const result = await controller.webhook(makeReq(Buffer.from('payload')), 'sig_123');
      expect(result).toEqual({
        received: true,
        type: 'customer.subscription.updated',
        sync: { action: 'ignored', reason: 'missing_provider_customer_id' },
      });
      expect(mockBilling.handleWebhook).toHaveBeenCalledWith({
        rawBody: Buffer.from('payload'),
        signature: 'sig_123',
      });
    });

    it('propagates handleWebhook errors', async () => {
      mockBilling.handleWebhook.mockRejectedValueOnce(new BadRequestException('Invalid signature'));
      await expect(controller.webhook(makeReq(Buffer.from('payload')), 'bad-sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
