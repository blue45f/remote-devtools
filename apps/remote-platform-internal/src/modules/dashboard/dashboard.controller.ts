import {
  Controller,
  Get,
  Logger,
  Query,
  BadRequestException,
} from "@nestjs/common";

import { DashboardService } from "./dashboard.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";
import { PeriodQueryDto } from "./dto/period-query.dto";
import { RecordRoomTrendDto } from "./dto/record-room-trend.dto";
import { TicketTrendDto } from "./dto/ticket-trend.dto";

@Controller("api/dashboard")
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Retrieve dashboard statistics.
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
      this.logger.error("Failed to retrieve dashboard statistics", error);
      throw new BadRequestException({
        success: false,
        error: {
          code: "DASHBOARD_STATS_ERROR",
          message:
            error.message ||
            "An error occurred while retrieving dashboard statistics.",
        },
      });
    }
  }

  /**
   * Retrieve ticket creation trend.
   * GET /api/dashboard/tickets/trend
   */
  @Get("tickets/trend")
  public async getTicketTrend(
    @Query() query: PeriodQueryDto,
  ): Promise<TicketTrendDto> {
    try {
      if (!query.period) {
        throw new BadRequestException("The 'period' parameter is required.");
      }

      if (!["day", "week", "month"].includes(query.period)) {
        throw new BadRequestException(
          "The 'period' parameter must be one of: day, week, month.",
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
      this.logger.error("Failed to retrieve ticket trend", error);
      throw new BadRequestException({
        success: false,
        error: {
          code: "TICKET_TREND_ERROR",
          message:
            error.message ||
            "An error occurred while retrieving the ticket trend.",
        },
      });
    }
  }

  /**
   * Retrieve recording session creation trend.
   * GET /api/dashboard/record-rooms/trend
   */
  @Get("record-rooms/trend")
  public async getRecordRoomTrend(
    @Query() query: PeriodQueryDto,
  ): Promise<RecordRoomTrendDto> {
    try {
      if (!query.period) {
        throw new BadRequestException("The 'period' parameter is required.");
      }

      if (!["day", "week", "month"].includes(query.period)) {
        throw new BadRequestException(
          "The 'period' parameter must be one of: day, week, month.",
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
      this.logger.error("Failed to retrieve record room trend", error);
      throw new BadRequestException({
        success: false,
        error: {
          code: "RECORD_ROOM_TREND_ERROR",
          message:
            error.message ||
            "An error occurred while retrieving the recording session trend.",
        },
      });
    }
  }
}
