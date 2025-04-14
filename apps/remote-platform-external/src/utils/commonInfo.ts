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

/**
 * 부분적인 CommonInfo 데이터를 받아서 완전한 CommonInfo 객체를 반환합니다.
 * 누락된 필드는 기본값으로 채워집니다.
 */
export const ensureCommonInfo = (
  partialCommonInfo?: Partial<CommonInfo>,
): CommonInfo => {
  const defaultInfo = getDefaultCommonInfo();

  if (!partialCommonInfo) {
    return defaultInfo;
  }

  return {
    user: {
      ...defaultInfo.user,
      ...(partialCommonInfo.user || {}),
    },
    device: {
      ...defaultInfo.device,
      ...(partialCommonInfo.device || {}),
    },
    supportData: partialCommonInfo.supportData || defaultInfo.supportData,
    URL: partialCommonInfo.URL || defaultInfo.URL,
    userAgent: partialCommonInfo.userAgent || defaultInfo.userAgent,
  };
};

/**
 * CommonInfo에서 안전하게 값을 추출하는 헬퍼 함수들
 */
export const getDeviceId = (commonInfo?: CommonInfo): string => {
  return commonInfo?.device?.deviceId || `unknown-${Date.now()}`;
};

export const getMemberId = (commonInfo?: CommonInfo): string => {
  return commonInfo?.user?.memberId || "unknown";
};

export const getUserBaedal = (commonInfo?: CommonInfo): string => {
  return commonInfo?.user?.userBaedal || "unknown";
};

/**
 * CommonInfo가 유효한지 검증합니다.
 * 최소한 deviceId와 memberId가 있어야 유효한 것으로 간주합니다.
 */
export const isValidCommonInfo = (commonInfo?: CommonInfo): boolean => {
  if (!commonInfo) return false;

  const hasValidDevice =
    commonInfo.device &&
    commonInfo.device.deviceId &&
    !commonInfo.device.deviceId.startsWith("unknown-");

  const hasValidUser =
    commonInfo.user &&
    commonInfo.user.memberId &&
    commonInfo.user.memberId !== "unknown";

  return !!(hasValidDevice && hasValidUser);
};
