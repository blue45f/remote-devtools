import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BillingService } from "./billing.service";

describe("BillingService", () => {
  const ORIGINAL = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = ORIGINAL;
  });

  it("reports disabled when STRIPE_SECRET_KEY is unset", () => {
    const svc = new BillingService();
    expect(svc.enabled).toBe(false);
  });

  it("reports enabled once STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const svc = new BillingService();
    expect(svc.enabled).toBe(true);
  });

  it("throws ServiceUnavailable for checkout when disabled", async () => {
    const svc = new BillingService();
    await expect(
      svc.createCheckoutSession({
        priceId: "price_x",
        orgId: "o1",
        successUrl: "https://x/success",
        cancelUrl: "https://x/cancel",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws ServiceUnavailable for portal when disabled", async () => {
    const svc = new BillingService();
    await expect(
      svc.createPortalSession({
        customerId: "cus_x",
        returnUrl: "https://x/return",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws ServiceUnavailable for webhook when disabled", async () => {
    const svc = new BillingService();
    await expect(
      svc.verifyWebhook({
        rawBody: Buffer.from("{}"),
        signature: "t=1,v1=abc",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("still throws (scaffold-not-implemented) once enabled", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const svc = new BillingService();
    // The scaffold deliberately throws even when enabled — no real Stripe call.
    await expect(
      svc.createCheckoutSession({
        priceId: "price_x",
        orgId: "o1",
        successUrl: "https://x/success",
        cancelUrl: "https://x/cancel",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
