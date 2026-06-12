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
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const host = readSdkEnv('VITE_INTERNAL_HOST', defaultHost);
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : '';
  const wsHost = host.replace(/^https?:\/\/(.+)$/, '$1');

  const protocol = host.startsWith('https') ? 'wss' : 'ws';
  // DevTools frontend에서 protocol을 추가하므로 host만 전달
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const roomUrl = `${host}/tabbed-debug/?${protocol}=${wsUrl}`;

  return roomUrl;
};

/**
 * 네이티브 앱에서 공통 정보를 가져오는 함수
 */
export const getCommonInfo = () => {
  if (!window.JavaScriptInterface) {
    return;
  }

  window.JavaScriptInterface.getCommonInfo('REMOTE_DEBUG_SDK_COMMON_INFO');
};
