import { describe, expect, it } from 'vitest';

import { checkoutSchema, portalSchema } from './billing.dto';

describe('Billing DTOs', () => {
  describe('checkoutSchema', () => {
    it('trims string fields via transformation', () => {
      const result = checkoutSchema.safeParse({
        priceId: '  price_pro  ',
        successUrl: 'https://app.example.com/  ',
        cancelUrl: '  https://app.example.com/cancel  ',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        priceId: 'price_pro',
        successUrl: 'https://app.example.com/',
        cancelUrl: 'https://app.example.com/cancel',
      });
    });

    it('rejects missing/blank checkout fields', () => {
      const result = checkoutSchema.safeParse({
        priceId: '   ',
        successUrl: '',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(result.success).toBe(false);
      const keys = new Set(result.error?.issues.map((issue) => issue.path[0]));
      expect(keys.has('priceId')).toBe(true);
      expect(keys.has('successUrl')).toBe(true);
      expect(keys.has('cancelUrl')).toBe(false);
    });
  });

  describe('portalSchema', () => {
    it('trims and validates returnUrl', () => {
      const result = portalSchema.safeParse({
        returnUrl: '  https://app.example.com/account  ',
      });

      expect(result.success).toBe(true);
      expect(result.data?.returnUrl).toBe('https://app.example.com/account');
    });

    it('rejects blank portal returnUrl', () => {
      const result = portalSchema.safeParse({
        returnUrl: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues[0].path[0]).toBe('returnUrl');
    });
  });
});
