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

import { CheckoutDto, PortalDto } from "./billing.dto";
import { BillingService } from "./billing.service";

/**
 * Billing routes — `/api/billing/{checkout,portal,webhook}`.
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
    return this.billing.getStatus();
  }

  @Get("subscription")
  @UseGuards(AuthGuard)
  public async subscription(@Auth() auth: AuthClaims | null) {
    const orgId = auth?.org?.trim();
    if (!orgId) {
      throw new BadRequestException("Authenticated org is required.");
    }
    return this.billing.getSubscriptionState(orgId);
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  public async checkout(
    @Auth() auth: AuthClaims | null,
    @Body() body: CheckoutDto,
  ) {
    const orgId = (auth?.org ?? "anonymous").trim();
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
  public async portal(
    @Auth() auth: AuthClaims | null,
    @Body() body: PortalDto,
  ) {
    const orgId = auth?.org?.trim();
    if (!orgId) {
      throw new BadRequestException("Authenticated org is required.");
    }
    return this.billing.createPortalSession({
      orgId,
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
    const result = await this.billing.handleWebhook({
      rawBody: raw,
      signature,
    });
    return { received: true, type: result.event.type, sync: result.sync };
  }
}
