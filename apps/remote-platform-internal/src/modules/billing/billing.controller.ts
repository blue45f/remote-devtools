import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Auth } from "../auth/auth.decorator";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthClaims } from "../auth/auth.service";
import { PlanGuard, RequirePlan } from "../auth/plan.guard";

import { BillingService } from "./billing.service";

interface CheckoutBody {
  /** Stripe price id (e.g. price_1ABC...). */
  priceId: string;
  /** Where to send the customer after success. */
  successUrl: string;
  /** Where to send the customer after cancel. */
  cancelUrl: string;
}

interface PortalBody {
  /** Stripe customer id, looked up server-side from the org row. */
  customerId: string;
  returnUrl: string;
}

/**
 * Stripe billing scaffold — `/api/billing/{checkout,portal,webhook}`.
 *
 * All routes return `503 Service Unavailable` until `STRIPE_SECRET_KEY` is set.
 * The frontend can probe `enabled` indirectly by hitting `/api/billing/status`.
 */
@ApiTags("Billing")
@Controller("api/billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /**
   * GET /api/billing/status
   * Public probe so the frontend can hide upgrade UI when self-hosted /
   * billing not configured. Returns:
   *   { enabled: false }                 → hide all upgrade CTAs
   *   { enabled: true, plans: [...] }    → render Pricing CTAs
   */
  @Get("status")
  public status() {
    if (!this.billing.enabled) {
      return { enabled: false };
    }
    return {
      enabled: true,
      plans: [
        { id: "free", name: "Free", monthly: 0 },
        { id: "starter", name: "Starter", monthly: 19 },
        { id: "pro", name: "Pro", monthly: 49 },
      ],
    };
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  public async checkout(
    @Auth() auth: AuthClaims | null,
    @Body() body: CheckoutBody,
  ) {
    if (!body.priceId || !body.successUrl || !body.cancelUrl) {
      throw new BadRequestException(
        "priceId, successUrl, and cancelUrl are required",
      );
    }
    const orgId = auth?.org ?? "anonymous";
    return this.billing.createCheckoutSession({
      priceId: body.priceId,
      orgId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Post("portal")
  @UseGuards(AuthGuard, PlanGuard)
  @RequirePlan("starter")
  @HttpCode(200)
  public async portal(@Body() body: PortalBody) {
    if (!body.customerId || !body.returnUrl) {
      throw new BadRequestException("customerId and returnUrl are required");
    }
    return this.billing.createPortalSession({
      customerId: body.customerId,
      returnUrl: body.returnUrl,
    });
  }

  /**
   * Stripe webhook receiver. The real implementation needs the raw request
   * body to verify the signature — configure express raw body parsing
   * (e.g. `app.useBodyParser('json', { verify: ... })`) before this route
   * in main.ts when enabling Stripe.
   */
  @Post("webhook")
  @HttpCode(200)
  public async webhook(
    @Req() req: Request,
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!this.billing.enabled) {
      throw new ServiceUnavailableException("Billing not enabled");
    }
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!raw) {
      throw new BadRequestException(
        "Webhook requires raw body — enable rawBody in main.ts",
      );
    }
    const event = await this.billing.verifyWebhook({
      rawBody: raw,
      signature,
    });
    // Future event handling: subscription.updated → update org plan, etc.
    return { received: true, type: event.type };
  }
}
