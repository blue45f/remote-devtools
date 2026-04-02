import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { RecordService } from "@remote-platform/core";
import {
  DomEntity,
  RecordEntity,
  ScreenEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  TicketLogEntity,
} from "@remote-platform/entity";

import { S3Service } from "../s3/s3.service";
import { WebviewController } from "./webview.controller";

describe("WebviewController (External)", () => {
  let controller: WebviewController;

  const mockRecordService = { findAll: vi.fn() };
  const mockS3Service = {};
  const mockTicketLogRepo = {
    count: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      addGroupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(0),
      getRawMany: vi.fn().mockResolvedValue([]),
    }),
    find: vi.fn().mockResolvedValue([]),
  };
  const mockRepo = {
    count: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    createQueryBuilder: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      addGroupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(0),
      getRawMany: vi.fn().mockResolvedValue([]),
      getRawOne: vi.fn().mockResolvedValue({ total: 0 }),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebviewController],
      providers: [
        { provide: RecordService, useValue: mockRecordService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: getRepositoryToken(TicketLogEntity), useValue: mockTicketLogRepo },
        { provide: getRepositoryToken(TicketComponentEntity), useValue: mockRepo },
        { provide: getRepositoryToken(TicketLabelEntity), useValue: mockRepo },
        { provide: getRepositoryToken(RecordEntity), useValue: mockRepo },
        { provide: getRepositoryToken(ScreenEntity), useValue: mockRepo },
        { provide: getRepositoryToken(DomEntity), useValue: mockRepo },
      ],
    }).compile();
    controller = module.get<WebviewController>(WebviewController);
  });

  describe("getTicketStats", () => {
    it("should return ticket statistics", async () => {
      mockTicketLogRepo.count.mockResolvedValue(100);

      const result = await controller.getTicketStats();

      expect(result).toHaveProperty("totalTickets");
      expect(result).toHaveProperty("todayTickets");
    });
  });

  describe("getSessionDetail", () => {
    it("should throw when sessionName is missing", async () => {
      await expect(
        controller.getSessionDetail(undefined as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("generateScreenshot", () => {
    it("should throw when recordId is missing", async () => {
      await expect(
        controller.generateScreenshot(undefined as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw for non-numeric recordId", async () => {
      await expect(
        controller.generateScreenshot("abc"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUserTickets", () => {
    it("should throw when deviceId is missing", async () => {
      await expect(
        controller.getUserTickets(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getSessionStats", () => {
    it("should return session statistics", async () => {
      const result = await controller.getSessionStats();

      expect(result).toHaveProperty("totalSessions");
      expect(result).toHaveProperty("todaySessions");
    });
  });

  describe("getUserSessions", () => {
    it("should throw when deviceId is missing", async () => {
      await expect(
        controller.getUserSessions(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getDailyStats", () => {
    it("should return daily ticket stats", async () => {
      const result = await controller.getDailyStats();
      expect(result).toBeDefined();
    });
  });

  describe("getComponentStats", () => {
    it("should return component statistics", async () => {
      const result = await controller.getComponentStats();
      expect(result).toBeDefined();
    });
  });

  describe("getLabelStats", () => {
    it("should return label statistics", async () => {
      const result = await controller.getLabelStats();
      expect(result).toBeDefined();
    });
  });

  describe("getTicketsByEpic", () => {
    it("should throw when parentEpic is missing", async () => {
      await expect(
        controller.getTicketsByEpic(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getTicketsByUrl", () => {
    it("should throw when url is missing", async () => {
      await expect(
        controller.getTicketsByUrl(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getSessionDailyStats", () => {
    it("should return session daily statistics", async () => {
      const result = await controller.getSessionDailyStats();
      expect(result).toBeDefined();
    });
  });
});
