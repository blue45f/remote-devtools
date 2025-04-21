import { Injectable } from "@nestjs/common";
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
  Record,
  TicketLogEntity,
  UserEntity,
} from "@remote-platform/entity";

import { DashboardStatsData } from "./dto/dashboard-stats.dto";
import { RecordRoomTrendItem } from "./dto/record-room-trend.dto";
import { TicketTrendItem } from "./dto/ticket-trend.dto";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TicketLogEntity)
    private readonly ticketLogRepository: Repository<TicketLogEntity>,
    @InjectRepository(Record)
    private readonly recordRepository: Repository<Record>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceInfoRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * 대시보드 통계 조회
   */
  public async getDashboardStats(): Promise<DashboardStatsData> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekAgo = subDays(now, 7);

    // 티켓 관련 통계
    const totalTickets = await this.ticketLogRepository.count();
    const todayTickets = await this.ticketLogRepository.count({
      where: {
        createdAt: Between(todayStart, todayEnd),
      },
    });

    // 주간 평균 계산
    const weeklyTickets = await this.ticketLogRepository.count({
      where: {
        createdAt: MoreThanOrEqual(weekAgo),
      },
    });
    const weeklyAverage = Math.round(weeklyTickets / 7);

    // 녹화 세션 관련 통계
    const totalRecordRooms = await this.recordRepository.count();
    const todayRecordRooms = await this.recordRepository.count({
      where: {
        timestamp: Between(todayStart, todayEnd),
      },
    });

    // 주간 평균 계산
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
   * 티켓 생성 추이 조회
   */
  public async getTicketTrend(
    period: "day" | "week" | "month",
    startDate?: string,
    endDate?: string,
  ): Promise<TicketTrendItem[]> {
    const dateRanges = this.getDateRanges(period, startDate, endDate);
    const result: TicketTrendItem[] = [];

    for (const range of dateRanges) {
      const created = await this.ticketLogRepository.count({
        where: {
          createdAt: Between(range.start, range.end),
        },
      });

      // 직군별 통계 (선택사항)
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
   * 녹화 세션 생성 추이 조회
   */
  public async getRecordRoomTrend(
    period: "day" | "week" | "month",
    startDate?: string,
    endDate?: string,
  ): Promise<RecordRoomTrendItem[]> {
    const dateRanges = this.getDateRanges(period, startDate, endDate);
    const result: RecordRoomTrendItem[] = [];

    for (const range of dateRanges) {
      const created = await this.recordRepository.count({
        where: {
          timestamp: Between(range.start, range.end),
        },
      });

      // 메시지 수와 참여자 수는 실제 데이터가 없으므로 임시로 생성
      // 실제로는 별도의 메시지 테이블이나 참여자 테이블에서 조회해야 함
      const messages = created * 20; // 임시 계산
      const participants = created * 3; // 임시 계산

      // 직군별 통계 (선택사항)
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
   * 기간별 날짜 범위 생성
   */
  private getDateRanges(
    period: "day" | "week" | "month",
    startDate?: string,
    endDate?: string,
  ): Array<{ start: Date; end: Date }> {
    const now = new Date();
    const ranges: Array<{ start: Date; end: Date }> = [];

    if (period === "day") {
      // 최근 7일
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        ranges.push({
          start: startOfDay(date),
          end: endOfDay(date),
        });
      }
    } else if (period === "week") {
      // 최근 8주
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
      // 최근 6개월
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

    // startDate와 endDate가 제공된 경우 필터링
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return ranges.filter((range) => range.start >= start && range.end <= end);
    }

    return ranges;
  }

  /**
   * 날짜 포맷팅
   */
  private formatDateByPeriod(
    date: Date,
    period: "day" | "week" | "month",
  ): string {
    if (period === "day") {
      return format(date, "MM-dd");
    } else if (period === "week") {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${format(date, "M/d")}-${format(weekEnd, "M/d")}`;
    } else {
      return format(date, "yyyy년 M월");
    }
  }

  /**
   * 티켓 직군별 통계
   */
  private async getTicketJobStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    developer?: number;
    designer?: number;
    pm?: number;
    qa?: number;
    other?: number;
  }> {
    const tickets = await this.ticketLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      select: ["username"],
    });

    const jobCounts = {
      developer: 0,
      designer: 0,
      pm: 0,
      qa: 0,
      other: 0,
    };

    // 성능 최적화: 모든 username을 한 번에 조회
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

    // username을 통해 직접 User를 찾는 것이 가장 효율적
    // (deviceId → DeviceInfoEntity → User보다 빠름)
    for (const ticket of tickets) {
      if (ticket.username) {
        const user = userMap.get(ticket.username);

        if (user) {
          switch (user.jobType) {
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
   * 녹화 세션 직군별 통계
   */
  private async getRoomJobStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    developer?: number;
    designer?: number;
    pm?: number;
    qa?: number;
    other?: number;
  }> {
    const records = await this.recordRepository.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
      select: ["deviceId"],
    });

    const jobCounts = {
      developer: 0,
      designer: 0,
      pm: 0,
      qa: 0,
      other: 0,
    };

    // 성능 최적화: 모든 deviceId를 한 번에 조회
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

    // deviceId를 통해 DeviceInfoEntity에서 user 찾기
    for (const record of records) {
      if (record.deviceId) {
        const deviceInfo = deviceMap.get(record.deviceId);

        if (deviceInfo?.user) {
          switch (deviceInfo.user.jobType) {
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
        } else {
          jobCounts.other += 1;
        }
      } else {
        jobCounts.other += 1;
      }
    }

    return jobCounts;
  }
}
