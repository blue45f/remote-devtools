/**
 * CORS origin allow-listing for the external platform.
 *
 * Extracted from `apps/remote-platform-external/src/main.ts` so the security
 * boundary is a pure, unit-testable function instead of an inline closure that
 * coverage tooling skips (`main.ts` is excluded in `vitest.config.ts`).
 *
 * Behaviour (preserved exactly from the original inline implementation):
 *   - A request with no `Origin` header (same-origin / server-to-server / curl)
 *     is allowed — browsers omit `Origin` for same-origin requests.
 *   - `http(s)://localhost` and `http(s)://localhost:<port>` are always allowed
 *     so local dev frontends work without configuration.
 *   - Each entry in `CORS_ALLOWED_ORIGINS` (comma-separated, e.g. `example.com`)
 *     allows any **sub**domain of that domain over http or https, with no path:
 *     `https://app.example.com` ✓, `https://staging.app.example.com` ✓.
 *
 * Caveat (intentional, documented by tests): the apex domain itself
 * (`https://example.com`) is NOT matched — only sub-domains are. Add the apex as
 * its own bare host upstream (or front it with a sub-domain) if you need it.
 */

const LOCALHOST_PATTERN = /^https?:\/\/localhost(:\d+)?$/;

/** Escape a domain so it is treated literally inside a RegExp. */
function escapeDomain(domain: string): string {
  return domain.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the list of allowed-origin matchers from the comma-separated
 * `CORS_ALLOWED_ORIGINS` value. Empty / whitespace-only entries are dropped so a
 * trailing comma or an unset variable can never widen the allow-list to `.*`.
 */
export function buildAllowedOriginPatterns(corsAllowedOrigins?: string): RegExp[] {
  const customPatterns = (corsAllowedOrigins ?? '')
    .split(',')
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0)
    .map((domain) => new RegExp(`^https?:\\/\\/[^/]+\\.${escapeDomain(domain)}$`));

  return [LOCALHOST_PATTERN, ...customPatterns];
}

/**
 * Decide whether `origin` is allowed.
 *
 * @param origin the request `Origin` header (may be undefined for same-origin
 *   / non-browser requests, which are always permitted)
 * @param corsAllowedOrigins raw `CORS_ALLOWED_ORIGINS` env value
 */
export function isOriginAllowed(origin: string | undefined, corsAllowedOrigins?: string): boolean {
  if (!origin) {
    return true;
  }

  return buildAllowedOriginPatterns(corsAllowedOrigins).some((pattern) => pattern.test(origin));
}

/**
 * Express/Nest `cors` `origin` callback factory. Pass the result straight to
 * `app.enableCors({ origin: createCorsOriginValidator() })`.
 */
export function createCorsOriginValidator(
  readEnv: () => string | undefined = () => process.env.CORS_ALLOWED_ORIGINS,
) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    if (isOriginAllowed(origin, readEnv())) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
}
