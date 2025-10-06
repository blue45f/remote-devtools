import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  endOfDay,
  format,
  startOfDay,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { Between, MoreThanOrEqual, Repository } from "typeorm";

import {
  DeviceInfoEntity,
  JobType,
  RecordEntity,
  TicketLogEntity,
  UserEntity,
} from "@remote-platform/entity";

import { DashboardStatsData } from "./dto/dashboard-stats.dto";
import { RecordRoomTrendItem } from "./dto/record-room-trend.dto";
import { TicketTrendItem } from "./dto/ticket-trend.dto";

type PeriodType = "day" | "week" | "month";

interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

interface JobCounts {
  developer: number;
  designer: number;
  pm: number;
  qa: number;
  other: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(TicketLogEntity)
    private readonly ticketLogRepository: Repository<TicketLogEntity>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceInfoRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * Retrieve dashboard statistics including ticket and recording session counts.
   */
  public async getDashboardStats(): Promise<DashboardStatsData> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekAgo = subDays(now, 7);

    // Ticket statistics
    const totalTickets = await this.ticketLogRepository.count();
    const todayTickets = await this.ticketLogRepository.count({
      where: {
        createdAt: Between(todayStart, todayEnd),
      },
    });

    // Weekly average calculation
    const weeklyTickets = await this.ticketLogRepository.count({
      where: {
        createdAt: MoreThanOrEqual(weekAgo),
      },
    });
    const weeklyAverage = Math.round(weeklyTickets / 7);

    // Recording session statistics
    const totalRecordRooms = await this.recordRepository.count();
    const todayRecordRooms = await this.recordRepository.count({
      where: {
        timestamp: Between(todayStart, todayEnd),
      },
    });

    // Weekly average calculation
    const weeklyRecordRooms = await this.recordRepository.count({
      where: {
        timestamp: MoreThanOrEqual(weekAgo),
      },
    });
    const weeklyAverageRecordRooms = Math.round(weeklyRecordRooms / 7);

    return {
      totalTickets,
      todayTickets,
      weeklyAverage,
      totalRecordRooms,
      todayRecordRooms,
      weeklyAverageRecordRooms,
    };
  }

  /**
   * Retrieve ticket creation trend over the specified period.
   */
  public async getTicketTrend(
    period: PeriodType,
    startDate?: string,
    endDate?: string,
  ): Promise<TicketTrendItem[]> {
    const dateRanges = this.buildDateRanges(period, startDate, endDate);
    const result: TicketTrendItem[] = [];

    for (const range of dateRanges) {
      const created = await this.ticketLogRepository.count({
        where: {
          createdAt: Between(range.start, range.end),
        },
      });

      const jobStats = await this.getTicketJobStats(range.start, range.end);

      result.push({
        date: this.formatDateByPeriod(range.start, period),
        created,
        ...jobStats,
      });
    }

    return result;
  }

  /**
   * Retrieve recording session creation trend over the specified period.
   */
  public async getRecordRoomTrend(
    period: PeriodType,
    startDate?: string,
    endDate?: string,
  ): Promise<RecordRoomTrendItem[]> {
    const dateRanges = this.buildDateRanges(period, startDate, endDate);
    const result: RecordRoomTrendItem[] = [];

    for (const range of dateRanges) {
      const created = await this.recordRepository.count({
        where: {
          timestamp: Between(range.start, range.end),
        },
      });

      // Placeholder calculations until dedicated message/participant tables exist
      const messages = created * 20;
      const participants = created * 3;

      const jobStats = await this.getRoomJobStats(range.start, range.end);

      result.push({
        date: this.formatDateByPeriod(range.start, period),
        created,
        messages,
        participants,
        ...jobStats,
      });
    }

    return result;
  }

  /**
   * Build date ranges for the given period granularity.
   */
  private buildDateRanges(
    period: PeriodType,
    startDate?: string,
    endDate?: string,
  ): DateRange[] {
    const now = new Date();
    const ranges: DateRange[] = [];

    if (period === "day") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        ranges.push({
          start: startOfDay(date),
          end: endOfDay(date),
        });
      }
    } else if (period === "week") {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = subWeeks(now, i);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        ranges.push({
          start: startOfDay(weekStart),
          end: endOfDay(weekEnd),
        });
      }
    } else if (period === "month") {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(now, i);
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        ranges.push({
          start: startOfDay(monthStart),
          end: endOfDay(monthEnd),
        });
      }
    }

    // Filter by custom start/end dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return ranges.filter((range) => range.start >= start && range.end <= end);
    }

    return ranges;
  }

  /**
   * Format a date label according to the period granularity.
   */
  private formatDateByPeriod(date: Date, period: PeriodType): string {
    if (period === "day") {
      return format(date, "MM-dd");
    } else if (period === "week") {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${format(date, "M/d")}-${format(weekEnd, "M/d")}`;
    } else {
      return format(date, "yyyy-MM");
    }
  }

  /**
   * Compute ticket counts per job type within a date range.
   */
  private async getTicketJobStats(
    startDate: Date,
    endDate: Date,
  ): Promise<JobCounts> {
    const tickets = await this.ticketLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      select: ["username"],
    });

    const jobCounts: JobCounts = {
      developer: 0,
      designer: 0,
      pm: 0,
      qa: 0,
      other: 0,
    };

    // Performance optimization: batch-fetch all users by username
    const usernames = tickets
      .map((t) => t.username)
      .filter((username): username is string => !!username);

    const uniqueUsernames = [...new Set(usernames)];

    const users =
      uniqueUsernames.length > 0
        ? await this.userRepository.find({
            where: uniqueUsernames.map((username) => ({ username })),
          })
        : [];

    const userMap = new Map(users.map((user) => [user.username, user]));

    // Look up each ticket's user directly by username for efficiency
    for (const ticket of tickets) {
      if (ticket.username) {
        const user = userMap.get(ticket.username);

        if (user) {
          this.incrementJobCount(jobCounts, user.jobType);
        } else {
          jobCounts.other += 1;
        }
      } else {
        jobCounts.other += 1;
      }
    }

    return jobCounts;
  }

  /**
   * Compute recording session counts per job type within a date range.
   */
  private async getRoomJobStats(
    startDate: Date,
    endDate: Date,
  ): Promise<JobCounts> {
    const records = await this.recordRepository.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
      select: ["deviceId"],
    });

    const jobCounts: JobCounts = {
      developer: 0,
      designer: 0,
      pm: 0,
      qa: 0,
      other: 0,
    };

    // Performance optimization: batch-fetch all device info with user relations
    const deviceIds = records
      .map((r) => r.deviceId)
      .filter((deviceId): deviceId is string => !!deviceId);

    const uniqueDeviceIds = [...new Set(deviceIds)];

    const deviceInfos =
      uniqueDeviceIds.length > 0
        ? await this.deviceInfoRepository.find({
            where: uniqueDeviceIds.map((deviceId) => ({ deviceId })),
            relations: ["user"],
          })
        : [];

    const deviceMap = new Map(deviceInfos.map((info) => [info.deviceId, info]));

    // Look up each record's user via DeviceInfoEntity
    for (const record of records) {
      if (record.deviceId) {
        const deviceInfo = deviceMap.get(record.deviceId);

        if (deviceInfo?.user) {
          this.incrementJobCount(jobCounts, deviceInfo.user.jobType);
        } else {
          jobCounts.other += 1;
        }
      } else {
        jobCounts.other += 1;
      }
    }

    return jobCounts;
  }

  /**
   * Increment the appropriate job count based on the user's job type.
   */
  private incrementJobCount(jobCounts: JobCounts, jobType: string): void {
    switch (jobType) {
      case JobType.DEV:
        jobCounts.developer += 1;
        break;
      case JobType.PD:
        jobCounts.designer += 1;
        break;
      case JobType.PM:
        jobCounts.pm += 1;
        break;
      case JobType.QA:
        jobCounts.qa += 1;
        break;
      default:
        jobCounts.other += 1;
    }
  }
}
