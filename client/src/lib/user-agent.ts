import i18n from '@/lib/i18n';

export interface ParsedUserAgent {
  browser: string;
  os: string;
}

/**
 * Tiny regex-based UA parser — good enough for displaying a "Chrome on
 * macOS" badge without pulling in a 50KB library. Tries the common
 * browsers and OSes first; falls back to "Unknown" so the badge never
 * disappears entirely.
 *
 * Not for server-side analytics or fingerprinting — the goal here is
 * a glanceable hint on the Session row / detail page.
 */
export function parseUserAgent(ua?: string | null): ParsedUserAgent | null {
  if (!ua || typeof ua !== 'string' || ua.trim().length === 0) return null;

  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
  };
}

function detectBrowser(ua: string): string {
  // Order matters — Edge / Opera / Brave all include "Chrome" in their UA.
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Brave/.test(ua)) return 'Brave';
  if (/Vivaldi/.test(ua)) return 'Vivaldi';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  if (/MSIE |Trident\//.test(ua)) return 'IE';
  return i18n.t('common.unknown');
}

function detectOS(ua: string): string {
  // iOS and Android come before macOS/Linux — iPhone UAs contain
  // "Mac OS X" too ("like Mac OS X"), Android UAs include "Linux".
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return i18n.t('common.unknown');
}

/** Compact "Chrome · macOS" style label. */
export function formatUserAgentBadge(ua?: string | null): string | null {
  const parsed = parseUserAgent(ua);
  if (!parsed) return null;
  return `${parsed.browser} · ${parsed.os}`;
}
