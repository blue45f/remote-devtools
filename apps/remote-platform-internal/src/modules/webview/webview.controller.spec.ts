import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { RecordService } from "@remote-platform/core";

import { AuthService } from "../auth/auth.service";
import { S3Service } from "../s3/s3.service";
import { WebviewGateway } from "./webview.gateway";
import { WebviewController } from "./webview.controller";

describe("WebviewController (Internal)", () => {
  let controller: WebviewController;
  const mockGateway = { getLiveRoomList: vi.fn() };
  const mockRecordService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findPaginated: vi.fn(),
  };
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
        // AuthGuard depends on AuthService — provide a stub so the test
        // module compiles. Auth is always disabled in tests, so the guard
        // short-circuits to canActivate=true.
        {
          provide: AuthService,
          useValue: { enabled: false, verify: vi.fn() },
        },
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
    it("should return record sessions as a bare array when no query params are present (back-compat)", async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: "Session-1",
            url: "https://example.com",
            deviceId: "dev-1",
            duration: 5000000000,
            recordMode: true,
            timestamp: new Date("2026-01-01"),
          },
        ],
        nextCursor: null,
      });

      const result = await controller.getRecordSessionList(null);

      expect(Array.isArray(result)).toBe(true);
      expect(result as unknown as { id: number }[]).toHaveLength(1);
      expect(
        (result as unknown as { id: number; recordMode: boolean }[])[0],
      ).toEqual(
        expect.objectContaining({
          id: 1,
          name: "Session-1",
          url: "https://example.com",
          deviceId: "dev-1",
          recordMode: true,
        }),
      );
    });

    it("returns the paginated envelope when filters are present", async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [
          { id: 7, name: "checkout", recordMode: true, timestamp: new Date() },
        ],
        nextCursor: "2026-04-27T00:00:00.000Z",
      });

      const result = (await controller.getRecordSessionList(
        null,
        "checkout",
      )) as {
        rows: unknown[];
        nextCursor: string | null;
      };

      expect(result.rows).toHaveLength(1);
      expect(result.nextCursor).toBe("2026-04-27T00:00:00.000Z");
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ q: "checkout" }),
      );
    });

    it("rejects an invalid limit", async () => {
      await expect(
        controller.getRecordSessionList(
          null,
          undefined,
          undefined,
          undefined,
          undefined,
          "abc",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("forces orgId from auth claims, ignoring an explicit orgId param", async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [],
        nextCursor: null,
      });
      const auth = { sub: "u1", org: "org-trusted", plan: "pro" } as const;
      // Caller tries to peek at another tenant via ?orgId=other
      await controller.getRecordSessionList(
        auth,
        undefined,
        undefined,
        undefined,
        "org-other",
        "10",
      );
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-trusted" }),
      );
    });

    it("falls back to the explicit orgId param when no auth claims (self-host)", async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [],
        nextCursor: null,
      });
      await controller.getRecordSessionList(
        null,
        undefined,
        undefined,
        undefined,
        "org-explicit",
        "10",
      );
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "org-explicit" }),
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
