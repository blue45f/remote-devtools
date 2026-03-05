import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  let controller: DashboardController;
  const mockDashboardService = {
    getDashboardStats: vi.fn(),
    getTicketTrend: vi.fn(),
    getRecordSessionTrend: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  describe("getStats", () => {
    it("should return dashboard statistics", async () => {
      const mockStats = {
        totalTickets: 100,
        todayTickets: 5,
        weeklyAverage: 10,
        totalRecordSessions: 200,
        todayRecordSessions: 8,
        weeklyAverageRecordSessions: 15,
      };
      mockDashboardService.getDashboardStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual({ success: true, data: mockStats });
    });

    it("should throw InternalServerErrorException on failure", async () => {
      mockDashboardService.getDashboardStats.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(controller.getStats()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("getTicketTrend", () => {
    it("should return ticket trend data", async () => {
      const mockTrend = [
        {
          date: "2026-04-01",
          created: 5,
          developer: 2,
          designer: 1,
          pm: 1,
          qa: 1,
          other: 0,
        },
      ];
      mockDashboardService.getTicketTrend.mockResolvedValue(mockTrend);

      const result = await controller.getTicketTrend({
        period: "day",
        startDate: "2026-04-01",
        endDate: "2026-04-01",
      });

      expect(result).toEqual({ success: true, data: mockTrend });
      expect(mockDashboardService.getTicketTrend).toHaveBeenCalledWith(
        "day",
        "2026-04-01",
        "2026-04-01",
      );
    });

    it("should throw BadRequestException when period is missing", async () => {
      await expect(
        controller.getTicketTrend({ period: undefined as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid period", async () => {
      await expect(
        controller.getTicketTrend({ period: "year" as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw InternalServerErrorException on service error", async () => {
      mockDashboardService.getTicketTrend.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(
        controller.getTicketTrend({ period: "day" }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("getRecordSessionTrend", () => {
    it("should return record session trend data", async () => {
      const mockTrend = [
        {
          date: "2026-04-01",
          created: 10,
          messages: 200,
          participants: 30,
          developer: 5,
          designer: 2,
          pm: 1,
          qa: 1,
          other: 1,
        },
      ];
      mockDashboardService.getRecordSessionTrend.mockResolvedValue(mockTrend);

      const result = await controller.getRecordSessionTrend({
        period: "week",
      });

      expect(result).toEqual({ success: true, data: mockTrend });
    });

    it("should throw BadRequestException when period is missing", async () => {
      await expect(
        controller.getRecordSessionTrend({ period: undefined as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
