import { IsIn, IsOptional, IsString, Matches } from "class-validator";

export class PeriodQueryDto {
  /** Query period granularity */
  @IsIn(["day", "week", "month"])
  readonly period: "day" | "week" | "month";

  /** Start date (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "startDate must be in YYYY-MM-DD format",
  })
  readonly startDate?: string;

  /** End date (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "endDate must be in YYYY-MM-DD format",
  })
  readonly endDate?: string;
}
