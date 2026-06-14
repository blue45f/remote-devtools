/**
 * Non-fatal startup environment validation for the NestJS platform apps.
 *
 * This is a *defensive, additive* check — it never throws and never exits. The
 * hard requirements (missing DB host / password / JWT secret in deployed
 * environments) are still enforced by each app's own `assertRequiredEnv()` in
 * `main.ts`; this module only *warns* so operators notice mis-configuration
 * (typos, wrong types, leftover dev defaults) early in the boot log without
 * risking a live boot.
 *
 * Usage (in `main.ts`, before/after `assertRequiredEnv()`):
 *
 *   import { validateEnv } from '@remote-platform/common';
 *   validateEnv();
 *
 * Behaviour:
 *   - `schema.safeParse(process.env)` — on failure, logs a single grouped
 *     warning listing the offending keys. Never throws.
 *   - In production (`NODE_ENV === 'production'`), if any secret still holds a
 *     well-known *insecure* default value, logs a prominent warning so the
 *     deployment is flagged.
 */

import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('EnvValidation');

/**
 * All keys are optional: the goal is to surface *malformed* values, not to
 * re-implement the required-var gate that already lives in `main.ts`. Numeric
 * ports are coerced/validated leniently so a stray non-numeric `PORT` is caught.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    APP_ENV: z.string().optional(),

    // Networking
    PORT: z.coerce.number().int().positive().optional(),
    HTTP_PORT: z.coerce.number().int().positive().optional(),
    HTTPS_PORT: z.coerce.number().int().positive().optional(),

    // Database
    DB_WRITER_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().positive().optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_SVC_USER_PASSWORD: z.string().optional(),

    // Auth / admin
    AUTH_JWT_SECRET: z.string().optional(),
    ADMIN_TOKEN: z.string().optional(),

    // Third-party integrations
    AWS_REGION: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    JIRA_API_TOKEN: z.string().optional(),
    SLACK_BOT_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
  })
  // Allow (ignore) every other env var — we only validate the keys we know.
  .loose();

/**
 * Env vars whose values must never be a leftover dev/sample default in
 * production. Keyed by the env var; the array lists known-insecure literals.
 */
const INSECURE_DEFAULTS: Readonly<Record<string, readonly string[]>> = {
  DB_PASSWORD: ['mypassword', 'change-me-in-production', 'CHANGE_ME_TO_A_STRONG_PASSWORD'],
  DB_SVC_USER_PASSWORD: ['mypassword', 'change-me-in-production'],
  AUTH_JWT_SECRET: ['dev-only-change-me-please', 'dev-secret-change-me', 'change-me-in-production'],
  ADMIN_TOKEN: ['dev-only-change-me-please', 'dev-secret-change-me', 'change-me-in-production'],
};

/**
 * Validate `process.env` against {@link envSchema}. Warns only — never throws,
 * never exits. Safe to call during boot.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    logger.warn(`[ENV] Environment variables failed validation (continuing anyway):\n${issues}`);
  }

  if ((env.NODE_ENV ?? '').toLowerCase() === 'production') {
    for (const [key, badValues] of Object.entries(INSECURE_DEFAULTS)) {
      const value = env[key]?.trim();
      if (value && badValues.includes(value)) {
        logger.warn(
          '\n' +
            '************************************************************\n' +
            `*  INSECURE DEFAULT DETECTED IN PRODUCTION                  *\n` +
            `*  ${key} is set to a well-known default value.            \n` +
            `*  Rotate it to a strong, unique secret immediately.       *\n` +
            '************************************************************',
        );
      }
    }
  }
}
