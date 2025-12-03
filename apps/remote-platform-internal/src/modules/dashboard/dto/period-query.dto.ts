export interface PeriodQueryDto {
  period: "day" | "week" | "month"; // 조회 기간
  startDate?: string; // 시작일 (YYYY-MM-DD)
  endDate?: string; // 종료일 (YYYY-MM-DD)
}
