import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const periodQuerySchema = z
  .object({
    /** Query period granularity */
    period: z.enum(['day', 'week', 'month']),
    /** Start date (YYYY-MM-DD) */
    startDate: z
      .string()
      .regex(DATE_PATTERN, { message: 'startDate must be in YYYY-MM-DD format' })
      .optional(),
    /** End date (YYYY-MM-DD) */
    endDate: z
      .string()
      .regex(DATE_PATTERN, { message: 'endDate must be in YYYY-MM-DD format' })
      .optional(),
  })
  .strict();

export class PeriodQueryDto extends createZodDto(periodQuerySchema) {}
