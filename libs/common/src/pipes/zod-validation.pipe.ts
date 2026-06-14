import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

import type { ZodError } from 'zod';

// Drop-in replacement for the class-validator `ValidationPipe`. It preserves the
// `{ message: string[] }` error body shape that the old pipe produced, so API
// consumers and the exception filters keep working unchanged.
//
// `createZodValidationPipe`'s `createValidationException` is typed `(error: unknown)`,
// so narrow it to `ZodError` to read `.issues`.
export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestException((error as ZodError).issues.map((issue) => issue.message)),
});
