import type { OrganizationPlan, OrganizationSubscriptionStatus } from '@remote-platform/entity';

export type BillingProviderId = 'stripe';

export interface BillingPlan {
  readonly id: OrganizationPlan;
  readonly name: string;
  readonly monthly: number;
}

export interface BillingStatus {
  readonly enabled: boolean;
  readonly provider?: BillingProviderId;
  readonly plans?: BillingPlan[];
}

export interface CheckoutSessionInput {
  readonly priceId: string;
  readonly orgId: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface PortalSessionInput {
  readonly customerId: string;
  readonly returnUrl: string;
}

export interface VerifyWebhookInput {
  readonly rawBody: Buffer;
  readonly signature: string;
}

export interface PortalSessionRequest {
  readonly orgId: string;
  readonly returnUrl: string;
}

export interface BillingSubscriptionSnapshot {
  readonly orgId?: string | null;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId?: string | null;
  readonly status?: OrganizationSubscriptionStatus | null;
  readonly plan?: OrganizationPlan | null;
  readonly currentPeriodEnd?: Date | null;
}

export interface VerifiedBillingEvent {
  readonly id: string;
  readonly type: string;
  readonly provider: BillingProviderId;
  readonly raw: unknown;
  readonly subscription?: BillingSubscriptionSnapshot;
}

export type BillingSyncResult =
  | {
      readonly action: 'updated';
      readonly providerCustomerId: string;
      readonly orgId?: string | null;
      readonly affected: number;
    }
  | {
      readonly action: 'ignored';
      readonly reason:
        | 'missing_provider_customer_id'
        | 'subscription_state_not_present'
        | 'duplicate_event';
    };

export interface BillingWebhookResult {
  readonly event: VerifiedBillingEvent;
  readonly sync: BillingSyncResult;
}

export interface BillingSubscriptionState {
  readonly plan: OrganizationPlan;
  readonly billingProvider: string | null;
  readonly billingSubscriptionId: string | null;
  readonly subscriptionStatus: OrganizationSubscriptionStatus | null;
  readonly subscriptionCurrentPeriodEnd: Date | null;
}
