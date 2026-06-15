import { readSdkEnv } from './env';

declare global {
  interface Window {
    JavaScriptInterface?: {
      getCommonInfo: (callbackName: string) => void;
    };
  }
}

/**
 * 방 주소를 변환하는 함수
 */
export const convertLink = (room: string, recordId: number | null) => {
  const defaultHost =
    typeof window !== 'undefined' ? globalThis.location.origin : 'http://localhost:3000';
  const host = readSdkEnv('VITE_INTERNAL_HOST', defaultHost);
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : '';
  const wsHost = host.replace(/^https?:\/\/(.+)$/, '$1');

  // The DevTools frontend opens `ws://<value>` from this param, so the value
  // MUST carry the gateway path — without it the socket lands on the root path
  // and the upgrade is refused. A recorded session replays from the internal
  // `/ws/playback` gateway; a live session joins the same gateway as a viewer.
  // Mirrors client/src/lib/devtools-link.ts buildDevToolsLink.
  const path = recordId ? '/ws/playback' : '/socket.io/';
  const protocol = host.startsWith('https') ? 'wss' : 'ws';
  const wsUrl = encodeURIComponent(`${wsHost}${path}?room=${room}${record}`);
  const roomUrl = `${host}/tabbed-debug/?${protocol}=${wsUrl}`;

  return roomUrl;
};

/**
 * 대시보드(React 클라이언트 SPA, Session Detail 페이지가 사는 곳)의 origin 해석.
 * 기본값은 현재 페이지 origin(샌드박스·단일 도메인 리버스 프록시 배포에서 정확).
 * 멀티 도메인은 VITE_INTERNAL_HOST / globalThis.REMOTE_DEBUG_SDK_ENV 로 재정의.
 */
const resolveDashboardHost = () =>
  readSdkEnv(
    'VITE_INTERNAL_HOST',
    typeof window !== 'undefined' ? globalThis.location.origin : 'http://localhost:3000',
  );

/**
 * 녹화 세션의 상세 페이지(리플레이/네트워크/콘솔/타임라인) 링크.
 * 녹화 세션은 raw CDP DevTools 가 아니라 캡처된 데이터를 제대로 렌더링하는
 * 이 대시보드 화면으로 보내는 것이 맞다.
 */
export const buildSessionLink = (recordId: number) =>
  `${resolveDashboardHost()}/sessions/${recordId}`;

/**
 * 스마트 공유 링크: 녹화 세션은 대시보드 상세 페이지를, 라이브 세션은 실시간
 * 점검용 Chrome DevTools(tabbed) 뷰를 연다.
 */
export const buildShareLink = (room: string, recordId: number | null) =>
  recordId ? buildSessionLink(recordId) : convertLink(room, null);

/**
 * 네이티브 앱에서 공통 정보를 가져오는 함수
 */
export const getCommonInfo = () => {
  if (!globalThis.JavaScriptInterface) {
    return;
  }

  globalThis.JavaScriptInterface.getCommonInfo('REMOTE_DEBUG_SDK_COMMON_INFO');
};
