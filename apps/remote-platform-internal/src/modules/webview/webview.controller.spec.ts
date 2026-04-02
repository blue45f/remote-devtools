import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { RecordService } from "@remote-platform/core";

import { S3Service } from "../s3/s3.service";
import { WebviewGateway } from "./webview.gateway";
import { WebviewController } from "./webview.controller";

describe("WebviewController (Internal)", () => {
  let controller: WebviewController;
  const mockGateway = { getLiveRoomList: vi.fn() };
  const mockRecordService = { findAll: vi.fn(), findOne: vi.fn() };
  const mockS3Service = {
    listBackupFiles: vi.fn(),
    listBackupFilesLight: vi.fn(),
    getBackupDataByDeviceId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebviewController],
      providers: [
        { provide: WebviewGateway, useValue: mockGateway },
        { provide: RecordService, useValue: mockRecordService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();
    controller = module.get<WebviewController>(WebviewController);
  });

  describe("getSessionList", () => {
    it("should return live room list", () => {
      mockGateway.getLiveRoomList.mockReturnValue([
        { id: 0, name: "Live-abc" },
      ]);

      const result = controller.getSessionList();

      expect(result).toEqual([{ id: 0, name: "Live-abc" }]);
    });

    it("should return empty array when no live rooms", () => {
      mockGateway.getLiveRoomList.mockReturnValue([]);
      expect(controller.getSessionList()).toEqual([]);
    });
  });

  describe("getRecordSessionList", () => {
    it("should return record sessions with metadata", async () => {
      mockRecordService.findAll.mockResolvedValue([
        {
          id: 1,
          name: "Session-1",
          url: "https://example.com",
          deviceId: "dev-1",
          duration: 5000000000,
          recordMode: true,
          timestamp: new Date("2026-01-01"),
        },
      ]);

      const result = await controller.getRecordSessionList();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          name: "Session-1",
          url: "https://example.com",
          deviceId: "dev-1",
          recordMode: true,
        }),
      );
    });
  });

  describe("getBackupList", () => {
    it("should return backup files", async () => {
      mockS3Service.listBackupFiles.mockResolvedValue([
        { fileName: "session_123.json", deviceId: "dev-1" },
      ]);

      const result = await controller.getBackupList("dev-1");

      expect(result).toHaveLength(1);
      expect(mockS3Service.listBackupFiles).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: "dev-1" }),
      );
    });

    it("should throw on invalid limit param", async () => {
      await expect(
        controller.getBackupList(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "abc",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
