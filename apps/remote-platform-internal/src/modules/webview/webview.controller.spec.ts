import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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
    replaceTags: vi.fn(),
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

  describe("putRecordTags", () => {
    it("normalises, dedupes and trims tags before persisting", async () => {
      mockRecordService.replaceTags.mockResolvedValue({
        id: 42,
        tags: ["bug", "checkout"],
      });
      const res = await controller.putRecordTags("42", {
        tags: ["  bug ", "bug", "checkout", "", null as unknown as string],
      });
      expect(res).toEqual({ id: 42, tags: ["bug", "checkout"] });
      expect(mockRecordService.replaceTags).toHaveBeenCalledWith(42, [
        "bug",
        "checkout",
      ]);
    });

    it("caps at 16 tags and 24 chars each", async () => {
      const long = "x".repeat(50);
      const many = Array.from({ length: 30 }, (_, i) => `t${i}`);
      mockRecordService.replaceTags.mockImplementation((_id, tags) =>
        Promise.resolve({ id: 1, tags }),
      );
      const res = await controller.putRecordTags("1", {
        tags: [long, ...many],
      });
      expect(res.tags[0]).toBe("x".repeat(24));
      expect(res.tags.length).toBe(16);
    });

    it("rejects non-integer recordId", async () => {
      await expect(
        controller.putRecordTags("abc", { tags: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-array body.tags", async () => {
      await expect(
        controller.putRecordTags("1", { tags: "nope" as unknown as string[] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("404s when record does not exist", async () => {
      mockRecordService.replaceTags.mockResolvedValue(null);
      await expect(
        controller.putRecordTags("999", { tags: ["bug"] }),
      ).rejects.toThrow(NotFoundException);
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
