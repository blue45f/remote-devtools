export interface TicketTrendItem {
  date: string; // 날짜 (period에 따라 형식 변경)
  created: number; // 생성된 티켓 수

  // 직군별 생성 수 (optional - 필요시 제공)
  developer?: number; // 개발자가 생성한 티켓
  designer?: number; // 디자이너가 생성한 티켓
  pm?: number; // PM이 생성한 티켓
  qa?: number; // QA가 생성한 티켓
  other?: number; // 기타 직군이 생성한 티켓
}

export interface TicketTrendDto {
  success: boolean;
  data?: TicketTrendItem[];
  error?: {
    code: string;
    message: string;
  };
}
