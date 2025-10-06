export interface PeriodQueryDto {
  /** Query period granularity */
  readonly period: "day" | "week" | "month";
  /** Start date (YYYY-MM-DD) */
  readonly startDate?: string;
  /** End date (YYYY-MM-DD) */
  readonly endDate?: string;
}
