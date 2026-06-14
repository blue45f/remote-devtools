import {
  Inject,
  Injectable,
  BadRequestException,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BillingWebhookEventEntity,
  OrganizationPlan,
  OrganizationEntity,
} from '@remote-platform/entity';
import { LessThan, QueryFailedError, type Repository } from 'typeorm';

import { BillingSubscriptionSyncService } from './billing-subscription-sync.service';
import { BILLING_PROVIDER, type BillingProvider, StripeBillingProvider } from './billing.provider';

import type {
  BillingPlan,
  BillingStatus,
  BillingSubscriptionState,
  PortalSessionRequest,
  VerifiedBillingEvent,
  BillingWebhookResult,
  CheckoutSessionInput,
  VerifyWebhookInput,
} from './billing.types';

type QueryFailedErrorWithDriver = QueryFailedError & {
  driverError?: { code?: string };
};

const PLAN_CATALOG: BillingPlan[] = [
  { id: 'free', name: 'Free', monthly: 0 },
  { id: 'starter', name: 'Starter', monthly: 19 },
  { id: 'pro', name: 'Pro', monthly: 49 },
];
const DEFAULT_PLAN: OrganizationPlan = 'free';

const WEBHOOK_RESERVATION_CLEANUP_INTERVAL_MS = Number(
  process.env.BILLING_WEBHOOK_RESERVATION_CLEANUP_INTERVAL_MS ?? '60000',
);
const WEBHOOK_RESERVATION_TTL_MS = Number(
  process.env.BILLING_WEBHOOK_RESERVATION_TTL_MS ?? '900000',
);

/**
 * Provider-agnostic billing orchestration.
 * Self-host operators leave billing env vars unset and the public status probe
 * reports disabled, so the frontend can hide paid upgrade flows.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private lastWebhookReservationCleanupAt = 0;

  public constructor(
    @Optional()
    @Inject(BILLING_PROVIDER)
    private readonly provider: BillingProvider = new StripeBillingProvider(),
    @Optional()
    private readonly subscriptionSync?: BillingSubscriptionSyncService,
    @Optional()
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository?: Repository<OrganizationEntity>,
    @Optional()
    @InjectRepository(BillingWebhookEventEntity)
    private readonly webhookEventRepository?: Repository<BillingWebhookEventEntity>,
  ) {}

  public get enabled(): boolean {
    return this.provider.enabled;
  }

  public getStatus(): BillingStatus {
    if (!this.enabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      provider: this.provider.id,
      plans: PLAN_CATALOG,
    };
  }

  /**
   * Build the redirect target for a Checkout session.
   */
  public async createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }> {
    this.assertEnabled();
    return this.provider.createCheckoutSession(input);
  }

  /**
   * Build the redirect target for the provider Customer Portal so a user can
   * manage their subscription / payment method.
   */
  public async createPortalSession(input: PortalSessionRequest): Promise<{ url: string }> {
    this.assertEnabled();
    const customerId = await this.resolveCustomerId(input);
    return this.provider.createPortalSession({
      customerId,
      returnUrl: input.returnUrl,
    });
  }

  public async getSubscriptionState(orgId: string): Promise<BillingSubscriptionState> {
    const organization = await this.resolveOrganization(orgId, 'subscription-state');
    return {
      plan: this.normalizePlan(organization?.plan),
      billingProvider: organization.billingProvider ?? null,
      billingSubscriptionId: organization.billingSubscriptionId ?? null,
      subscriptionStatus: organization.subscriptionStatus ?? null,
      subscriptionCurrentPeriodEnd: organization.subscriptionCurrentPeriodEnd ?? null,
    };
  }

  /**
   * Verify the webhook signature, normalize the event, and sync local
   * subscription state when the event carries subscription data.
   */
  public async handleWebhook(input: VerifyWebhookInput): Promise<BillingWebhookResult> {
    this.assertEnabled();
    await this.cleanupWebhookReservationBacklog();
    const event = await this.provider.verifyWebhook(input);
    const alreadyProcessed = await this.assertWebhookEventUniqueness(event);
    if (alreadyProcessed) {
      this.logger.debug(
        `[BILLING_WEBHOOK] duplicate event ignored provider=${event.provider}, id=${event.id}`,
      );
      return {
        event,
        sync: { action: 'ignored', reason: 'duplicate_event' },
      };
    }
    let sync: BillingWebhookResult['sync'] = {
      action: 'ignored',
      reason: 'subscription_state_not_present',
    };
    if (!this.subscriptionSync) {
      this.logger.debug('[BILLING_WEBHOOK] no subscription sync configured');
    } else {
      try {
        sync = await this.subscriptionSync.syncFromBillingEvent(event);
      } catch (error) {
        await this.clearWebhookEventReservation(event);
        throw error;
      }
    }

    this.logger.debug(
      `[BILLING_WEBHOOK] provider=${event.provider}, type=${event.type}, sync=${sync.action}`,
    );

    return { event, sync };
  }

  private async assertWebhookEventUniqueness(
    event: VerifiedBillingEvent,
    options: { retriedAfterReservationClear?: boolean } = {},
  ): Promise<boolean> {
    if (!this.webhookEventRepository) {
      return false;
    }

    try {
      await this.webhookEventRepository.insert({
        provider: event.provider,
        providerEventId: event.id,
        providerEventType: event.type,
      });
      return false;
    } catch (error) {
      if (error instanceof QueryFailedError && this.isDuplicateWebhookEventError(error)) {
        if (
          !options.retriedAfterReservationClear &&
          this.shouldRetryWebhookEventAfterReservationTimeout(event)
        ) {
          const stale = await this.isWebhookReservationStale(event);
          if (stale) {
            const cleared = await this.clearWebhookEventReservation(event);
            if (cleared) {
              return this.assertWebhookEventUniqueness(event, {
                retriedAfterReservationClear: true,
              });
            }

            this.logger.warn(
              `[BILLING_WEBHOOK] stale reservation cleanup failed provider=${event.provider}, id=${event.id}; skipping retry to avoid duplicate reprocessing`,
            );
            return true;
          }
        }
        return true;
      }
      throw error;
    }
  }

  private async clearWebhookEventReservation(event: VerifiedBillingEvent): Promise<boolean> {
    if (!this.webhookEventRepository) {
      return true;
    }

    try {
      await this.webhookEventRepository.delete({
        provider: event.provider,
        providerEventId: event.id,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `[BILLING_WEBHOOK] failed to clear webhook reservation provider=${event.provider}, id=${event.id} after sync failure: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async cleanupWebhookReservationBacklog(now = Date.now()): Promise<void> {
    if (!this.webhookEventRepository) {
      return;
    }

    if (now - this.lastWebhookReservationCleanupAt < WEBHOOK_RESERVATION_CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastWebhookReservationCleanupAt = now;

    if (!Number.isFinite(WEBHOOK_RESERVATION_TTL_MS) || WEBHOOK_RESERVATION_TTL_MS <= 0) {
      return;
    }

    const canDelete = 'delete' in this.webhookEventRepository;
    if (!canDelete) {
      return;
    }

    try {
      const cutoff = new Date(now - WEBHOOK_RESERVATION_TTL_MS);
      const deleted = await this.webhookEventRepository.delete({
        receivedAt: LessThan(cutoff),
      });
      const removed = typeof deleted?.affected === 'number' ? deleted.affected : 0;
      if (removed > 0) {
        this.logger.debug(`[BILLING_WEBHOOK] cleaned stale reservation markers count=${removed}`);
      }
    } catch (error) {
      this.logger.warn(
        `[BILLING_WEBHOOK] failed to cleanup stale webhook reservation markers: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async isWebhookReservationStale(event: VerifiedBillingEvent): Promise<boolean> {
    if (
      !this.webhookEventRepository ||
      !this.shouldRetryWebhookEventAfterReservationTimeout(event)
    ) {
      return false;
    }

    const hasFindOne = 'findOne' in this.webhookEventRepository;
    if (!hasFindOne) {
      return false;
    }

    let existing: Pick<BillingWebhookEventEntity, 'receivedAt'> | null | undefined;
    try {
      existing = await this.webhookEventRepository.findOne({
        where: {
          provider: event.provider,
          providerEventId: event.id,
        },
      });
    } catch (error) {
      this.logger.warn(
        `[BILLING_WEBHOOK] failed to read webhook reservation metadata provider=${event.provider}, id=${event.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }

    if (!existing?.receivedAt) {
      return false;
    }

    const receivedAtMs = new Date(existing.receivedAt).getTime();
    if (!Number.isFinite(receivedAtMs)) {
      return false;
    }

    const ageMs = Date.now() - receivedAtMs;
    return ageMs > WEBHOOK_RESERVATION_TTL_MS;
  }

  private shouldRetryWebhookEventAfterReservationTimeout(event: VerifiedBillingEvent): boolean {
    if (!event.provider || !event.id) {
      return false;
    }

    return Number.isFinite(WEBHOOK_RESERVATION_TTL_MS) && WEBHOOK_RESERVATION_TTL_MS > 0;
  }

  private normalizePlan(plan: unknown): OrganizationPlan {
    if (plan === 'free' || plan === 'starter' || plan === 'pro') {
      return plan;
    }

    return DEFAULT_PLAN;
  }

  private isDuplicateWebhookEventError(error: QueryFailedError): boolean {
    const queryFailedError = error as QueryFailedErrorWithDriver;
    const driverCode = queryFailedError.driverError?.code;
    const fallbackCode = (error as { code?: string }).code;
    return driverCode === '23505' || fallbackCode === '23505';
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Billing is disabled. Set STRIPE_SECRET_KEY to enable.',
      );
    }
  }

  private async resolveCustomerId(input: PortalSessionRequest): Promise<string> {
    const organization = await this.resolveOrganization(input.orgId, 'portal');

    const customerId = organization?.stripeCustomerId;
    if (!customerId) {
      throw new BadRequestException('No Stripe customer is configured for this organization.');
    }

    return customerId;
  }

  private async resolveOrganization(
    orgId: string,
    context: 'portal' | 'subscription-state',
  ): Promise<OrganizationEntity> {
    if (!this.organizationRepository) {
      throw new ServiceUnavailableException(
        context === 'subscription-state'
          ? 'Billing subscription state requires organization repository wiring.'
          : 'Billing portal requires organization repository wiring.',
      );
    }

    const normalizedOrgId = orgId.trim();
    if (!normalizedOrgId) {
      throw new BadRequestException('Authenticated org is required.');
    }

    const organization = await this.organizationRepository.findOne({
      where: [{ id: normalizedOrgId }, { slug: normalizedOrgId }],
    });
    if (!organization) {
      throw new BadRequestException(`Organization not found for id "${normalizedOrgId}".`);
    }

    return organization;
  }
}
