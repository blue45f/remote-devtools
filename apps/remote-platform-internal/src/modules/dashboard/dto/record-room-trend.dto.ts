export interface RecordRoomTrendItem {
  date: string; // 날짜 (period에 따라 형식 변경)
  created: number; // 생성된 녹화 세션 수
  messages: number; // 총 메시지 수
  participants: number; // 총 참여자 수

  // 직군별 생성 수 (optional - 필요시 제공)
  developer?: number; // 개발자가 생성한 녹화 세션
  designer?: number; // 디자이너가 생성한 녹화 세션
  pm?: number; // PM이 생성한 녹화 세션
  qa?: number; // QA가 생성한 녹화 세션
  other?: number; // 기타 직군이 생성한 녹화 세션
}

export interface RecordRoomTrendDto {
  success: boolean;
  data?: RecordRoomTrendItem[];
  error?: {
    code: string;
    message: string;
  };
}
