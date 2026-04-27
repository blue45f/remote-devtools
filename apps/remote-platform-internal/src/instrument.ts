/**
 * Sentry instrumentation for the internal NestJS app. Imported FIRST in
 * main.ts so its hooks are installed before any other module imports.
 *
 * No-op when `SENTRY_DSN` is unset — self-host single-tenant deployments
 * don't need Sentry, and the package install adds zero runtime cost
 * because `init()` short-circuits.
 */
import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
  // eslint-disable-next-line no-console
  console.log("[sentry] enabled");
}
