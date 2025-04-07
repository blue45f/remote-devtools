/**
 * 방 주소를 변환하는 함수
 */
export const convertLink = (room: string, recordId: number | null) => {
  // NOTE: 개발 HMR 활용될 때 import.meta.env 가 없으므로 이를 대응하기 위한 코드
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const host = import.meta.env?.VITE_INTERNAL_HOST || "http://localhost:3000";
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsHost = host?.replace(/^https?:\/\/(.+)$/, "$1");

  const protocol = host.startsWith("https") ? "wss" : "ws";
  // DevTools frontend에서 protocol을 추가하므로 host만 전달
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const roomUrl = `${host}/tabbed-debug/?${protocol}=${wsUrl}`;

  return roomUrl;
};

/**
 * 네이티브 앱에서 공통 정보를 가져오는 함수
 */
export const getCommonInfo = () => {
  const ctx = window as any;

  if (!("JavaScriptInterface" in ctx)) {
    return;
  }

  ctx.JavaScriptInterface.getCommonInfo("REMOTE_DEBUG_SDK_COMMON_INFO");
};
