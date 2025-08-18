import { CommonInfo } from "../modules/webview/webview.gateway";

/**
 * CommonInfo의 기본값을 반환합니다.
 */
export const getDefaultCommonInfo = (): CommonInfo => ({
  user: {
    userBaedal: "unknown",
    authorization: "unknown",
    memberId: "unknown",
    memberNumber: "unknown",
    perseusClientId: undefined,
    perseusSessionId: undefined,
  },
  device: {
    adid: "unknown",
    att: undefined,
    appsflyerId: "unknown",
    deviceBaedal: undefined,
    deviceId: `unknown-device`,
    sessionId: `session-${Date.now()}`,
    actionTrackingKey: undefined,
    osVersion: "unknown",
    webUserAgent: "unknown",
    deviceModel: "unknown",
    carrier: "unknown",
    idfv: undefined,
  },
  supportData: "",
  URL: "unknown-url",
  userAgent: "unknown-useragent",
});

