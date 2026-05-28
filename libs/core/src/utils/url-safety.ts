/**
 * URL safety helpers — primarily used to guard outbound `fetch()` calls
 * against SSRF (Server-Side Request Forgery) by rejecting URLs that point
 * at private/loopback/link-local network ranges or cloud metadata services.
 */

/** Hostnames that resolve to internal infrastructure and must never be fetched. */
const BLOCKED_HOSTNAMES = new Set<string>([
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
]);

const IPV4_CIDRS: ReadonlyArray<readonly [number, number]> = [
  // 127.0.0.0/8 (loopback)
  [ipv4ToInt(127, 0, 0, 0), 8],
  // 10.0.0.0/8 (RFC1918)
  [ipv4ToInt(10, 0, 0, 0), 8],
  // 172.16.0.0/12 (RFC1918)
  [ipv4ToInt(172, 16, 0, 0), 12],
  // 192.168.0.0/16 (RFC1918)
  [ipv4ToInt(192, 168, 0, 0), 16],
  // 169.254.0.0/16 (link-local)
  [ipv4ToInt(169, 254, 0, 0), 16],
];

function ipv4ToInt(a: number, b: number, c: number, d: number): number {
  // Use unsigned right shift to keep the result in the 32-bit range.
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function parseIpv4(host: string): number | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    nums.push(n);
  }
  return ipv4ToInt(nums[0], nums[1], nums[2], nums[3]);
}

function isPrivateIpv4(host: string): boolean {
  const intIp = parseIpv4(host);
  if (intIp === null) return false;
  for (const [base, bits] of IPV4_CIDRS) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((intIp & mask) === (base & mask)) return true;
  }
  return false;
}

function isPrivateIpv6(host: string): boolean {
  // Strip enclosing brackets if present (URL.hostname does this for us,
  // but be defensive).
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // fc00::/7 — Unique local addresses (covers fc.. and fd..)
  if (/^fc[0-9a-f]{2}:/.test(normalized) || /^fd[0-9a-f]{2}:/.test(normalized)) {
    return true;
  }
  // fe80::/10 — Link-local
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Validates a URL before making an outbound HTTP request from the server.
 *
 * Throws `Error` (or returns false in `isSafePublicUrl`) when the URL:
 *   - Is not a valid absolute URL.
 *   - Uses a non-http(s) scheme (e.g. `file:`, `gopher:`, `data:`).
 *   - Points at a literal `localhost`, cloud metadata endpoint, or a
 *     private/loopback/link-local IPv4 or IPv6 address.
 */
export function assertSafePublicUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Disallowed URL scheme: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  if (isPrivateIpv4(hostname)) {
    throw new Error(`Blocked private IPv4 address: ${hostname}`);
  }

  if (hostname.includes(':') && isPrivateIpv6(hostname)) {
    throw new Error(`Blocked private IPv6 address: ${hostname}`);
  }

  return parsed;
}

export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    assertSafePublicUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}
