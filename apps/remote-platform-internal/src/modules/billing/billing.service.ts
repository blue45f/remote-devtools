import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

/**
 * Stripe billing service scaffold.
 *
 * Intentionally provider-agnostic at the boundary so swapping Stripe for Lemon
 * Squeezy / Paddle / Polar later is a one-file change. The real Stripe client
 * is lazy-loaded only when `STRIPE_SECRET_KEY` is set so dev/self-host builds
 * don't pay the dependency cost.
 *
 * Self-host operators leave the env var unset and every method throws a
 * 503 — the SaaS frontend should hide billing UI when that happens.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  public get enabled(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  /**
   * Build the redirect target for a Stripe Checkout session. Returns the URL
   * the frontend should send the user to.
   */
  public async createCheckoutSession(input: {
    priceId: string;
    orgId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    this.assertEnabled();
    // The real call is intentionally not made here so the scaffold has zero
    // runtime dependency on `stripe`. To enable, install `stripe` and replace
    // the body with:
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    //   const session = await stripe.checkout.sessions.create({ ... });
    //   return { url: session.url! };
    this.logger.warn(
      `[scaffold] checkout requested for org=${input.orgId} price=${input.priceId} — implement Stripe call here`,
    );
    throw new ServiceUnavailableException(
      "Billing scaffold: Stripe integration not yet implemented. " +
        "See apps/remote-platform-internal/src/modules/billing/billing.service.ts",
    );
  }

  /**
   * Build the redirect target for the Stripe Customer Portal so a user can
   * manage their subscription / payment method.
   */
  public async createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    this.assertEnabled();
    this.logger.warn(
      `[scaffold] portal requested for customer=${input.customerId} — implement Stripe call here`,
    );
    throw new ServiceUnavailableException(
      "Billing scaffold: Stripe portal not yet implemented",
    );
  }

  /**
   * Verify the Stripe webhook signature and return the parsed event.
   *
   * Real implementation:
   *   stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
   */
  public async verifyWebhook(_input: {
    rawBody: Buffer;
    signature: string;
  }): Promise<{ type: string; data: unknown }> {
    this.assertEnabled();
    throw new ServiceUnavailableException(
      "Billing scaffold: webhook verification not implemented",
    );
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        "Billing is disabled. Set STRIPE_SECRET_KEY to enable.",
      );
    }
  }
}
