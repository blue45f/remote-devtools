/**
 * DeskCloud 위젯 마운트 — 전역 셸에 1회만 올라가는 유니버설 위젯 모음.
 * ──────────────────────────────────────────────────────────────────────────
 * 각 위젯은 해당 desk 의 VITE_*_URL 환경변수가 설정됐을 때만 렌더됩니다(env-gated).
 * URL 이 비어 있으면(기본값) 아무것도 그리지 않아 앱에 전혀 영향이 없습니다.
 *
 *  - ChangelogDesk  → 우하단 "What's new" 런처(변경 이력)
 *  - NotifyDesk     → 알림 벨(드롭다운 인박스) — recipientId 는 로그인 사용자(sub) 또는 익명 ID
 *  - SearchDesk     → ⌘K 검색 팔레트(전역 단축키)
 *
 * publishable 키는 브라우저 노출이 안전하며, 미설정 시 'pk_demo' 로 폴백합니다.
 */
import { type ReactElement } from 'react';

import { useAuth } from '@/lib/auth';

import { ChangelogWidget } from './changelogdesk/ChangelogWidget';
import { NotificationBell } from './notifydesk/NotificationBell';
import { SearchPalette } from './searchdesk/SearchPalette';

const ANON_RECIPIENT_KEY = 'notifydesk:recipientId';
let anonRecipientFallback: string | null = null;

/** 로그인 사용자가 없을 때 NotifyDesk 인박스를 묶을 안정적인 익명 식별자. */
function getAnonRecipientId(): string {
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem(ANON_RECIPIENT_KEY);
      if (existing) return existing;
      const c = (globalThis as { crypto?: Crypto }).crypto;
      const created =
        c && typeof c.randomUUID === 'function'
          ? `anon-${c.randomUUID()}`
          : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(ANON_RECIPIENT_KEY, created);
      return created;
    } catch {
      /* 스토리지 차단 → 메모리 폴백 */
    }
  }
  if (!anonRecipientFallback) anonRecipientFallback = `anon-${Date.now().toString(36)}`;
  return anonRecipientFallback;
}

export function DeskCloudWidgets(): ReactElement {
  const { claims } = useAuth();
  const recipientId = claims?.sub ?? getAnonRecipientId();

  return (
    <>
      {/* ChangelogDesk — 우하단 "What's new" 런처. SurveyDesk 피드백 버튼과 겹치지
          않도록 좌하단에 배치(피드백은 기본 우하단). */}
      {import.meta.env.VITE_CHANGELOGDESK_URL ? (
        <ChangelogWidget
          publishableKey={import.meta.env.VITE_CHANGELOGDESK_PK ?? 'pk_demo'}
          endpoint={import.meta.env.VITE_CHANGELOGDESK_URL}
          position="bottom-left"
        />
      ) : null}

      {/* SearchDesk — 전역 ⌘K 검색 팔레트(uncontrolled: 자체 단축키 등록). */}
      {import.meta.env.VITE_SEARCHDESK_URL ? (
        <SearchPalette
          publishableKey={import.meta.env.VITE_SEARCHDESK_PK ?? 'pk_demo'}
          endpoint={import.meta.env.VITE_SEARCHDESK_URL}
        />
      ) : null}

      {/* NotifyDesk — 알림 벨. 페이지 우상단 등 고정 위치에 띄워 비파괴적으로 노출. */}
      {import.meta.env.VITE_NOTIFYDESK_URL ? (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 2147483000,
          }}
        >
          <NotificationBell
            recipientId={recipientId}
            publishableKey={import.meta.env.VITE_NOTIFYDESK_PK ?? 'pk_demo'}
            endpoint={import.meta.env.VITE_NOTIFYDESK_URL}
          />
        </div>
      ) : null}
    </>
  );
}

export default DeskCloudWidgets;
