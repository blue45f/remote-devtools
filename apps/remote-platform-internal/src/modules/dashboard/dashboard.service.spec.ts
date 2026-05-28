import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  DeviceInfoEntity,
  RecordEntity,
  TicketLogEntity,
  UserEntity,
} from '@remote-platform/entity';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const mockTicketLogRepo = { count: vi.fn(), find: vi.fn() };
  const mockRecordRepo = { count: vi.fn(), find: vi.fn(), createQueryBuilder: vi.fn() };
  const mockUserRepo = { find: vi.fn() };
  const mockDeviceInfoRepo = { find: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(TicketLogEntity),
          useValue: mockTicketLogRepo,
        },
        { provide: getRepositoryToken(RecordEntity), useValue: mockRecordRepo },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(DeviceInfoEntity),
          useValue: mockDeviceInfoRepo,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getDashboardStats', () => {
    it('should return all dashboard statistics', async () => {
      mockTicketLogRepo.count
        .mockResolvedValueOnce(100) // totalTickets
        .mockResolvedValueOnce(5) // todayTickets
        .mockResolvedValueOnce(35); // weeklyTickets
      mockRecordRepo.count
        .mockResolvedValueOnce(200) // totalRecordSessions
        .mockResolvedValueOnce(8) // todayRecordSessions
        .mockResolvedValueOnce(56); // weeklyRecordSessions

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalTickets: 100,
        todayTickets: 5,
        weeklyAverage: 5, // 35 / 7
        totalRecordSessions: 200,
        todayRecordSessions: 8,
        weeklyAverageRecordSessions: 8, // 56 / 7
      });
    });

    it('should handle zero counts', async () => {
      mockTicketLogRepo.count.mockResolvedValue(0);
      mockRecordRepo.count.mockResolvedValue(0);

      const result = await service.getDashboardStats();

      expect(result.totalTickets).toBe(0);
      expect(result.weeklyAverage).toBe(0);
    });
  });

  describe('getTicketTrend', () => {
    it('should return daily trend for 7 days', async () => {
      mockTicketLogRepo.count.mockResolvedValue(3);
      mockTicketLogRepo.find.mockResolvedValue([]);
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.getTicketTrend('day');

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('created');
      expect(result[0]).toHaveProperty('developer');
      expect(result[0]).toHaveProperty('designer');
      expect(result[0]).toHaveProperty('pm');
      expect(result[0]).toHaveProperty('qa');
      expect(result[0]).toHaveProperty('other');
    });

    it('should return weekly trend for 8 weeks', async () => {
      mockTicketLogRepo.count.mockResolvedValue(0);
      mockTicketLogRepo.find.mockResolvedValue([]);
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.getTicketTrend('week');

      expect(result).toHaveLength(8);
    });

    it('should return monthly trend for 6 months', async () => {
      mockTicketLogRepo.count.mockResolvedValue(0);
      mockTicketLogRepo.find.mockResolvedValue([]);
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.getTicketTrend('month');

      expect(result).toHaveLength(6);
    });
  });

  describe('getRecordSessionTrend', () => {
    it('should return daily trend with messages and participants', async () => {
      mockRecordRepo.count.mockResolvedValue(10);
      mockRecordRepo.find.mockResolvedValue([]);
      mockDeviceInfoRepo.find.mockResolvedValue([]);
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.getRecordSessionTrend('day');

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('messages');
      expect(result[0]).toHaveProperty('participants');
      // messages = created * 20, participants = created * 3
      expect(result[0].messages).toBe(result[0].created * 20);
      expect(result[0].participants).toBe(result[0].created * 3);
    });
  });

  describe('getTopHosts', () => {
    it('returns top hosts mapped from the raw query', async () => {
      const getRawMany = vi.fn().mockResolvedValue([
        { host: 'shop.example.com', count: '42' },
        { host: 'admin.example.com', count: 17 },
        { host: '', count: 5 }, // empty host filtered out
      ]);
      const qb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany,
      };
      mockRecordRepo.createQueryBuilder.mockReturnValue(qb);

      const rows = await service.getTopHosts('day', 8);
      expect(rows).toEqual([
        { host: 'shop.example.com', count: 42 },
        { host: 'admin.example.com', count: 17 },
      ]);
      // The limit clamps within [1, 25].
      expect(qb.limit).toHaveBeenCalledWith(8);
    });

    it('clamps the limit between 1 and 25', async () => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };
      mockRecordRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getTopHosts('day', 9999);
      expect(qb.limit).toHaveBeenCalledWith(25);

      await service.getTopHosts('day', 0);
      expect(qb.limit).toHaveBeenCalledWith(1);
    });
  });
});
