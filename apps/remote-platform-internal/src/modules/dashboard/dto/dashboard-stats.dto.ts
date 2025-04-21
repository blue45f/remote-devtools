export interface DashboardStatsData {
  // 티켓 관련 통계
  totalTickets: number; // 전체 티켓 수 (누적)
  todayTickets: number; // 오늘 생성된 티켓 수
  weeklyAverage: number; // 주간 일평균 티켓 생성 수

  // 녹화 세션 관련 통계
  totalRecordRooms: number; // 전체 녹화 세션 수 (누적)
  todayRecordRooms: number; // 오늘 생성된 녹화 세션 수
  weeklyAverageRecordRooms: number; // 주간 일평균 녹화 세션 생성 수
}

export interface DashboardStatsDto {
  success: boolean;
  data?: DashboardStatsData;
  error?: {
    code: string;
    message: string;
  };
}
