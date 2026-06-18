import { useEffect } from 'react';

const BASE = 'Remote DevTools';
const DEFAULT_TITLE = `${BASE} — 웹을 위한 오픈 소스 원격 디버깅 플랫폼`;

/**
 * Sets a per-page `document.title` so tabs, bookmarks, shares, and the
 * RouteAnnouncer reflect the current page. Falls back to the marketing title
 * when `title` is empty, and restores it on unmount so a page without its own
 * title can't leak the previous one. Mirrors index.html's `<title>`.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
