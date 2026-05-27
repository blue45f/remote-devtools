import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CheckoutDto, PortalDto } from "./billing.dto";

describe("Billing DTOs", () => {
  describe("CheckoutDto", () => {
    it("trims string fields via transformation", async () => {
      const dto = plainToInstance(CheckoutDto, {
        priceId: "  price_pro  ",
        successUrl: "https://app.example.com/  ",
        cancelUrl: "  https://app.example.com/cancel  ",
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toEqual({
        priceId: "price_pro",
        successUrl: "https://app.example.com/",
        cancelUrl: "https://app.example.com/cancel",
      });
    });

    it("rejects missing/blank checkout fields", async () => {
      const dto = plainToInstance(CheckoutDto, {
        priceId: "   ",
        successUrl: "",
        cancelUrl: "https://app.example.com/cancel",
      });

      const errors = await validate(dto);
      const keys = new Set(errors.map((error) => error.property));
      expect(keys.has("priceId")).toBe(true);
      expect(keys.has("successUrl")).toBe(true);
      expect(keys.has("cancelUrl")).toBe(false);
    });
  });

  describe("PortalDto", () => {
    it("trims and validates returnUrl", async () => {
      const dto = plainToInstance(PortalDto, {
        returnUrl: "  https://app.example.com/account  ",
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.returnUrl).toBe("https://app.example.com/account");
    });

    it("rejects blank portal returnUrl", async () => {
      const dto = plainToInstance(PortalDto, {
        returnUrl: "   ",
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("returnUrl");
    });
  });
});
