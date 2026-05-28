import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  BillingProviderId,
  CheckoutSessionInput,
  PortalSessionInput,
  VerifiedBillingEvent,
  VerifyWebhookInput,
} from './billing.types';
import type { OrganizationPlan, OrganizationSubscriptionStatus } from '@remote-platform/entity';

export interface BillingProvider {
  readonly id: BillingProviderId;
  readonly enabled: boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createPortalSession(input: PortalSessionInput): Promise<{ url: string }>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedBillingEvent>;
}

interface StripeClientLike {
  readonly checkout: {
    readonly sessions: {
      create: StripeCheckoutSessionCreateFn;
    };
  };

  readonly billingPortal: {
    readonly sessions: {
      create: StripeBillingPortalSessionCreateFn;
    };
  };

  readonly webhooks: {
    constructEvent: StripeConstructEvent;
  };
}

type StripeClientInstance = InstanceType<typeof Stripe>;
type StripeCheckoutSessionCreateParams = Parameters<
  StripeClientInstance['checkout']['sessions']['create']
>[0];
type StripeCheckoutSessionCreateFn = (
  params: StripeCheckoutSessionCreateParams,
) => Promise<{ url: string | null }>;
type StripeBillingPortalSessionCreateParams = Parameters<
  StripeClientInstance['billingPortal']['sessions']['create']
>[0];
type StripeBillingPortalSessionCreateFn = (
  params: StripeBillingPortalSessionCreateParams,
) => Promise<{ url: string | null }>;
type StripeConstructEvent = StripeClientInstance['webhooks']['constructEvent'];

const VALID_PLANS = new Set<OrganizationPlan>(['free', 'starter', 'pro']);
const VALID_SUBSCRIPTION_STATUSES = new Set<OrganizationSubscriptionStatus>([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asPlan(value: unknown): OrganizationPlan | null {
  const plan = asString(value);
  return plan && VALID_PLANS.has(plan as OrganizationPlan) ? (plan as OrganizationPlan) : null;
}

function asSubscriptionStatus(value: unknown): OrganizationSubscriptionStatus | null {
  const status = asString(value);
  return status && VALID_SUBSCRIPTION_STATUSES.has(status as OrganizationSubscriptionStatus)
    ? (status as OrganizationSubscriptionStatus)
    : null;
}

function asCustomerId(value: unknown): string | null {
  const valueAsString = asString(value);
  if (valueAsString) return valueAsString;
  if (isRecord(value)) return asString(value.id);
  return null;
}

function priceIdToPlan(priceId: string | undefined): OrganizationPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return null;
}

function extractPlan(subscription: Record<string, unknown>): OrganizationPlan | null {
  const metadata = isRecord(subscription.metadata) ? subscription.metadata : undefined;
  const metadataPlan = asPlan(metadata?.plan);
  if (metadataPlan) return metadataPlan;

  const items = isRecord(subscription.items) ? subscription.items : undefined;
  const data = Array.isArray(items?.data) ? items.data : [];
  const firstItem = data.find(isRecord);
  const price = firstItem && isRecord(firstItem.price) ? firstItem.price : null;
  return priceIdToPlan(asString(price?.id));
}

function extractCurrentPeriodEnd(subscription: Record<string, unknown>): Date | null {
  const value = subscription.current_period_end;
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  if (typeof value === 'number') {
    const isUnixSeconds = value > 0 && value < 10_000_000_000;
    return new Date(isUnixSeconds ? value * 1000 : value);
  }

  const stringValue = value.trim();
  const numericValue = Number(stringValue);
  if (Number.isFinite(numericValue) && String(numericValue) === stringValue) {
    const isUnixSeconds = numericValue > 0 && numericValue < 10_000_000_000;
    return new Date(isUnixSeconds ? numericValue * 1000 : numericValue);
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return null;
  }

  return asDate;
}

function extractSubscription(
  eventType: string,
  payload: Record<string, unknown>,
): VerifiedBillingEvent['subscription'] {
  const data = isRecord(payload.data) ? payload.data : undefined;
  const object = data && isRecord(data.object) ? data.object : undefined;
  if (!object) return undefined;

  const isSubscriptionEvent = eventType.startsWith('customer.subscription.');
  if (!isSubscriptionEvent) return undefined;

  const providerCustomerId = asCustomerId(object.customer);
  if (!providerCustomerId) return undefined;
  const metadata = isRecord(object.metadata) ? object.metadata : undefined;

  return {
    orgId: asString(metadata?.orgId) ?? null,
    providerCustomerId,
    providerSubscriptionId: asString(object.id) ?? null,
    status: asSubscriptionStatus(object.status),
    plan: extractPlan(object),
    currentPeriodEnd: extractCurrentPeriodEnd(object),
  };
}

function assertSafeRedirectUrl(url: string, field: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException(`${field} must be a valid URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException(`${field} must use http or https`);
  }

  const allowedOrigins = process.env.BILLING_ALLOWED_RETURN_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins?.length && !allowedOrigins.includes(parsed.origin)) {
    throw new BadRequestException(`${field} origin is not allowed`);
  }
}

function buildMetadata(input: CheckoutSessionInput): Record<string, string> {
  const metadata: Record<string, string> = {
    orgId: input.orgId,
    priceId: input.priceId,
  };
  const plan = priceIdToPlan(input.priceId);
  if (plan) {
    metadata.plan = plan;
  }
  return metadata;
}

export class StripeBillingProvider implements BillingProvider {
  public readonly id = 'stripe';
  private client: StripeClientLike | null = null;

  public constructor(client?: StripeClientLike) {
    this.client = client ?? null;
  }

  public get enabled(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  public async createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }> {
    this.assertEnabled();
    assertSafeRedirectUrl(input.successUrl, 'successUrl');
    assertSafeRedirectUrl(input.cancelUrl, 'cancelUrl');

    const metadata = buildMetadata(input);
    const session = await this.getClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orgId,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe did not return a Checkout session URL.');
    }

    return { url: session.url };
  }

  public async createPortalSession(input: PortalSessionInput): Promise<{ url: string }> {
    this.assertEnabled();
    assertSafeRedirectUrl(input.returnUrl, 'returnUrl');

    const session = await this.getClient().billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe did not return a Customer Portal session URL.');
    }

    return { url: session.url };
  }

  public async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedBillingEvent> {
    this.assertEnabled();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET is required to verify billing webhooks.',
      );
    }

    let parsed: unknown;
    try {
      parsed = this.getClient().webhooks.constructEvent(
        input.rawBody,
        input.signature,
        webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `Invalid Stripe webhook signature: ${error.message}`
          : 'Invalid Stripe webhook signature',
      );
    }

    if (!isRecord(parsed)) {
      throw new BadRequestException('Invalid Stripe webhook payload');
    }

    const id = asString(parsed.id);
    const type = asString(parsed.type);
    if (!id || !type) {
      throw new BadRequestException('Stripe webhook is missing id or type');
    }

    return {
      id,
      type,
      provider: this.id,
      raw: parsed,
      subscription: extractSubscription(type, parsed),
    };
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Billing is disabled. Set STRIPE_SECRET_KEY to enable.',
      );
    }
  }

  private getClient(): StripeClientLike {
    if (this.client) {
      return this.client;
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new ServiceUnavailableException(
        'Billing is disabled. Set STRIPE_SECRET_KEY to enable.',
      );
    }

    this.client = new Stripe(secret, {
      appInfo: {
        name: 'remote-devtools',
        version: process.env.npm_package_version,
      },
    }) as StripeClientLike;
    return this.client;
  }
}

export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');
