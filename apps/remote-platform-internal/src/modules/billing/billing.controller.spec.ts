import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthClaims } from "../auth/auth.service";

import { BillingController } from "./billing.controller";
import type { BillingService } from "./billing.service";

describe("BillingController", () => {
  let mockBilling: {
    enabled: boolean;
    createCheckoutSession: ReturnType<typeof vi.fn>;
    createPortalSession: ReturnType<typeof vi.fn>;
    verifyWebhook: ReturnType<typeof vi.fn>;
  };
  let controller: BillingController;

  beforeEach(() => {
    mockBilling = {
      enabled: true,
      createCheckoutSession: vi
        .fn()
        .mockResolvedValue({ url: "https://stripe.test/checkout/abc" }),
      createPortalSession: vi
        .fn()
        .mockResolvedValue({ url: "https://stripe.test/portal/xyz" }),
      verifyWebhook: vi
        .fn()
        .mockResolvedValue({ type: "customer.subscription.updated", data: {} }),
    };
    controller = new BillingController(
      mockBilling as unknown as BillingService,
    );
  });

  describe("status", () => {
    it("returns { enabled: false } when billing is disabled", () => {
      mockBilling.enabled = false;
      expect(controller.status()).toEqual({ enabled: false });
    });

    it("returns enabled + plans list when billing is enabled", () => {
      mockBilling.enabled = true;
      const result = controller.status();
      expect(result).toEqual({
        enabled: true,
        plans: [
          { id: "free", name: "Free", monthly: 0 },
          { id: "starter", name: "Starter", monthly: 19 },
          { id: "pro", name: "Pro", monthly: 49 },
        ],
      });
    });
  });

  describe("checkout", () => {
    const validBody = {
      priceId: "price_123",
      successUrl: "https://app.test/ok",
      cancelUrl: "https://app.test/cancel",
    };

    it("throws BadRequestException when priceId is missing", async () => {
      await expect(
        controller.checkout(null, { ...validBody, priceId: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when successUrl is missing", async () => {
      await expect(
        controller.checkout(null, { ...validBody, successUrl: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when cancelUrl is missing", async () => {
      await expect(
        controller.checkout(null, { ...validBody, cancelUrl: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("uses 'anonymous' as orgId when no auth claims are present", async () => {
      const result = await controller.checkout(null, validBody);
      expect(result).toEqual({ url: "https://stripe.test/checkout/abc" });
      expect(mockBilling.createCheckoutSession).toHaveBeenCalledWith({
        priceId: "price_123",
        orgId: "anonymous",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      });
    });

    it("uses auth.org as orgId when claims include it", async () => {
      const claims = { sub: "u-1", org: "org-42" } as AuthClaims;
      await controller.checkout(claims, validBody);
      expect(mockBilling.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-42" }),
      );
    });

    it("propagates service errors (e.g. 503 when scaffold disabled)", async () => {
      mockBilling.createCheckoutSession.mockRejectedValueOnce(
        new ServiceUnavailableException("Billing is disabled"),
      );
      await expect(controller.checkout(null, validBody)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("portal", () => {
    const validBody = {
      customerId: "cus_123",
      returnUrl: "https://app.test/account",
    };

    it("throws BadRequestException when customerId is missing", async () => {
      await expect(
        controller.portal({ ...validBody, customerId: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when returnUrl is missing", async () => {
      await expect(
        controller.portal({ ...validBody, returnUrl: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("returns the portal URL on the happy path", async () => {
      const result = await controller.portal(validBody);
      expect(result).toEqual({ url: "https://stripe.test/portal/xyz" });
      expect(mockBilling.createPortalSession).toHaveBeenCalledWith({
        customerId: "cus_123",
        returnUrl: "https://app.test/account",
      });
    });

    it("propagates service errors (e.g. 503 when scaffold disabled)", async () => {
      mockBilling.createPortalSession.mockRejectedValueOnce(
        new ServiceUnavailableException("Billing is disabled"),
      );
      await expect(controller.portal(validBody)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("webhook", () => {
    const makeReq = (rawBody?: Buffer): Request =>
      ({ rawBody }) as unknown as Request;

    it("throws ServiceUnavailableException when billing is disabled", async () => {
      mockBilling.enabled = false;
      await expect(
        controller.webhook(makeReq(Buffer.from("{}")), "sig"),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("throws BadRequestException when stripe-signature header is missing", async () => {
      await expect(
        controller.webhook(makeReq(Buffer.from("{}")), undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when rawBody is missing", async () => {
      await expect(
        controller.webhook(makeReq(undefined), "sig"),
      ).rejects.toThrow(BadRequestException);
    });

    it("verifies and returns { received, type } on the happy path", async () => {
      const result = await controller.webhook(
        makeReq(Buffer.from("payload")),
        "sig_123",
      );
      expect(result).toEqual({
        received: true,
        type: "customer.subscription.updated",
      });
      expect(mockBilling.verifyWebhook).toHaveBeenCalledWith({
        rawBody: Buffer.from("payload"),
        signature: "sig_123",
      });
    });

    it("propagates verifyWebhook errors", async () => {
      mockBilling.verifyWebhook.mockRejectedValueOnce(
        new BadRequestException("Invalid signature"),
      );
      await expect(
        controller.webhook(makeReq(Buffer.from("payload")), "bad-sig"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
