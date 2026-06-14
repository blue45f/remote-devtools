import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Trim first, reject blanks, cap length, then validate as a URL. `z.url()` only
// requires a protocol (no TLD), matching the old `@IsUrl({ require_tld: false })`.
const trimmedUrl = z.string().trim().min(1).max(2048).pipe(z.url());

export const checkoutSchema = z
  .object({
    priceId: z.string().trim().min(1).max(100),
    successUrl: trimmedUrl,
    cancelUrl: trimmedUrl,
  })
  .strict();

export class CheckoutDto extends createZodDto(checkoutSchema) {}

export const portalSchema = z
  .object({
    returnUrl: trimmedUrl,
  })
  .strict();

export class PortalDto extends createZodDto(portalSchema) {}
