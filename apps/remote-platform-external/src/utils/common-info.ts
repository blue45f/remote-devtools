import { CommonInfo } from "../modules/webview/webview.gateway";

/**
 * Returns a CommonInfo object populated with safe default/unknown values.
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
    /** Advertising ID (Google ADID / Apple IDFA) */
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
    /** Identifier for Vendor (iOS) */
    idfv: undefined,
  },
  supportData: "",
  URL: "unknown-url",
  userAgent: "unknown-useragent",
});
