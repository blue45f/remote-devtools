import { Controller, Get, Query, BadRequestException } from "@nestjs/common";

import { DashboardService } from "./dashboard.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";
import { PeriodQueryDto } from "./dto/period-query.dto";
import { RecordRoomTrendDto } from "./dto/record-room-trend.dto";
import { TicketTrendDto } from "./dto/ticket-trend.dto";

@Controller("api/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 대시보드 통계 조회
   * GET /api/dashboard/stats
   */
  @Get("stats")
  public async getStats(): Promise<DashboardStatsDto> {
    try {
      const data = await this.dashboardService.getDashboardStats();
      return {
        success: true,
        data,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: "DASHBOARD_STATS_ERROR",
          message:
            error.message || "대시보드 통계 조회 중 오류가 발생했습니다.",
        },
      });
    }
  }

  /**
   * 티켓 생성 추이 조회
   * GET /api/dashboard/tickets/trend
   */
  @Get("tickets/trend")
  public async getTicketTrend(
    @Query() query: PeriodQueryDto,
  ): Promise<TicketTrendDto> {
    try {
      if (!query.period) {
        throw new BadRequestException("period 파라미터는 필수입니다.");
      }

      if (!["day", "week", "month"].includes(query.period)) {
        throw new BadRequestException(
          "period는 day, week, month 중 하나여야 합니다.",
        );
      }

      const data = await this.dashboardService.getTicketTrend(
        query.period,
        query.startDate,
        query.endDate,
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: "TICKET_TREND_ERROR",
          message: error.message || "티켓 추이 조회 중 오류가 발생했습니다.",
        },
      });
    }
  }

  /**
   * 녹화 세션 생성 추이 조회
   * GET /api/dashboard/record-rooms/trend
   */
  @Get("record-rooms/trend")
  public async getRecordRoomTrend(
    @Query() query: PeriodQueryDto,
  ): Promise<RecordRoomTrendDto> {
    try {
      if (!query.period) {
        throw new BadRequestException("period 파라미터는 필수입니다.");
      }

      if (!["day", "week", "month"].includes(query.period)) {
        throw new BadRequestException(
          "period는 day, week, month 중 하나여야 합니다.",
        );
      }

      const data = await this.dashboardService.getRecordRoomTrend(
        query.period,
        query.startDate,
        query.endDate,
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: "RECORD_ROOM_TREND_ERROR",
          message:
            error.message || "녹화 세션 추이 조회 중 오류가 발생했습니다.",
        },
      });
    }
  }
}
