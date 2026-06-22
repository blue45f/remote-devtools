/**
 * TermsDesk public policy client.
 *
 * Legal documents (terms of service, privacy policy) are authored and
 * versioned centrally on TermsDesk and served from its public, CORS-open,
 * unauthenticated JSON API. This module deliberately bypasses `apiFetch`:
 * that helper prefixes our own backend host and consults the demo-mode seed
 * router, neither of which applies to an external registry.
 */

export const TERMSDESK_BASE = 'https://desk-platform.vercel.app/termsdesk';
export const TERMSDESK_ORG = 'remote-devtools';

/** Canonical TermsDesk slugs for the documents this app links to. */
export const POLICY_SLUGS = {
  terms: 'terms-of-service',
  privacy: 'privacy-policy',
} as const;

export type PolicySlug = (typeof POLICY_SLUGS)[keyof typeof POLICY_SLUGS];

/** Support board stays external on purpose — it is a TermsDesk-hosted board. */
export const SUPPORT_URL = `${TERMSDESK_BASE}/support/${TERMSDESK_ORG}`;

/** Human-readable TermsDesk page for a policy — used as the fallback / canonical link. */
export function policyExternalUrl(slug: PolicySlug): string {
  return `${TERMSDESK_BASE}/p/${TERMSDESK_ORG}/${slug}`;
}

/** Shape of `GET /api/public/:org/policies/:slug` (JSON variant). */
export interface PublicPolicy {
  orgName: string;
  policySlug: string;
  name: string;
  type: string;
  locale: string;
  versionId: string;
  versionLabel: string;
  /** SHA-256 over the body — append-only integrity anchor. */
  contentHash: string;
  /** Markdown-ish / plain text document body. */
  body: string;
  effectiveAt: string;
  publishedAt: string;
  changeSummary?: string | null;
  availableVersions?: string[];
}

export async function fetchPublicPolicy(
  slug: PolicySlug,
  signal?: AbortSignal,
): Promise<PublicPolicy> {
  const res = await fetch(`${TERMSDESK_BASE}/api/public/${TERMSDESK_ORG}/policies/${slug}`, {
    headers: { Accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`TermsDesk responded ${res.status}`);
  }
  return (await res.json()) as PublicPolicy;
}

/* ───────── Minimal body renderer model ─────────
 *
 * Policy bodies are trusted-but-plain text: blank-line separated blocks,
 * optionally with markdown `#` headings, Korean statute headings
 * ("제1조 (목적)") and `-`/`*` bullet lines. We parse just those shapes into
 * blocks and let React render them — no HTML variant, no innerHTML, so there
 * is nothing to sanitize.
 */

export type PolicyBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const MD_HEADING = /^#{1,6}\s+(.+)$/;
/** Korean statute clause headers: "제1조 (목적)", "제 12 조 본문…" */
const CLAUSE_HEADING = /^제\s?\d+\s?조(\s|\(|$)/;
const LIST_ITEM = /^[-*]\s+(.+)$/;

export function parsePolicyBody(body: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = [];

  for (const chunk of body.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let start = 0;
    const md = MD_HEADING.exec(lines[0]);
    if (md) {
      blocks.push({ type: 'heading', text: md[1].trim() });
      start = 1;
    } else if (lines.length > 1 && CLAUSE_HEADING.test(lines[0])) {
      // Promote "제N조 …" to a heading only when the clause has body lines,
      // so a lone reference like "제3조를 참고하세요." stays a paragraph.
      blocks.push({ type: 'heading', text: lines[0] });
      start = 1;
    }

    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length > 0) {
        blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
        paragraph = [];
      }
    };
    const flushList = () => {
      if (list.length > 0) {
        blocks.push({ type: 'list', items: list });
        list = [];
      }
    };

    for (const line of lines.slice(start)) {
      const item = LIST_ITEM.exec(line);
      if (item) {
        flushParagraph();
        list.push(item[1].trim());
      } else {
        flushList();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushList();
  }

  return blocks;
}
