/**
 * 네이티브 앱에서 전달받는 공통 정보 타입
 */
export type CommonInfo = {
  user: {
    userBaedal: string;
    authorization: string;
    memberId: string;
    memberNumber: string;
  };
  device: {
    adid: string;
    att: number; // ATT 상태 값. iOS 14이상에서만 사용 됨.
    appsflyerId: string;
    deviceBaedal: string; // 에뮬레이터/루팅 여부, AOS 에서만 제공됨.
    deviceId: string;
    sessionId: string;
    /** 12.20.0 이상 */
    actionTrackingKey: string; // 마케팅 플랫폼 키
    osVersion: string;
    webUserAgent: string;
    deviceModel: string;
    carrier: string; // 통신사 정보,
    /** 14.4.0 이상 */
    idfv: string;
  };
  /** 12.5.0 이상 */
  supportData: string;
};

export type AgentInfo = {
  os: string;
  browser: string;
  URL: string;
};
