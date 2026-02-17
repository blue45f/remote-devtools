import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { SessionReplayController } from "./session-replay.controller";
import { SessionReplayService } from "./session-replay.service";

describe("SessionReplayController", () => {
  let controller: SessionReplayController;
  const mockService = {
    getSessions: vi.fn(),
    getSessionMetadata: vi.fn(),
    loadSession: vi.fn(),
    loadSessionChunk: vi.fn(),
    loadSessionFromS3File: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionReplayController],
      providers: [
        { provide: SessionReplayService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SessionReplayController>(SessionReplayController);
  });

  describe("getSessions", () => {
    it("should return sessions with default pagination", async () => {
      const mockSessions = [{ id: 1, room: "room-1" }];
      mockService.getSessions.mockResolvedValue(mockSessions);

      const result = await controller.getSessions(undefined, undefined);

      expect(mockService.getSessions).toHaveBeenCalledWith(20, 0, undefined);
      expect(result).toEqual(mockSessions);
    });

    it("should pass custom limit and offset", async () => {
      mockService.getSessions.mockResolvedValue([]);

      await controller.getSessions(10, 5, "test-room");

      expect(mockService.getSessions).toHaveBeenCalledWith(10, 5, "test-room");
    });
  });

  describe("getSessionMetadata", () => {
    it("should return session metadata by ID", async () => {
      const mockMetadata = { id: 1, room: "room-1", eventCount: 100 };
      mockService.getSessionMetadata.mockResolvedValue(mockMetadata);

      const result = await controller.getSessionMetadata(1);

      expect(result).toEqual(mockMetadata);
      expect(mockService.getSessionMetadata).toHaveBeenCalledWith(1);
    });
  });

  describe("getSessionEvents", () => {
    it("should load from S3 file path when provided", async () => {
      const mockEvents = [{ type: 2, timestamp: 1000 }];
      mockService.loadSessionFromS3File.mockResolvedValue(mockEvents);

      const result = await controller.getSessionEvents(
        "123",
        undefined,
        undefined,
        "2026-04-01/device-1/session_123.json",
      );

      expect(mockService.loadSessionFromS3File).toHaveBeenCalledWith(
        "2026-04-01/device-1/session_123.json",
      );
      expect(result).toEqual(mockEvents);
    });

    it("should load S3 session when ID starts with s3-", async () => {
      mockService.loadSession.mockResolvedValue([]);

      await controller.getSessionEvents("s3-abc123");

      expect(mockService.loadSession).toHaveBeenCalledWith("s3-abc123");
    });

    it("should load DB session by numeric ID", async () => {
      mockService.loadSession.mockResolvedValue([]);

      await controller.getSessionEvents("42");

      expect(mockService.loadSession).toHaveBeenCalledWith(42);
    });

    it("should load session chunk when startTime and endTime provided", async () => {
      mockService.loadSessionChunk.mockResolvedValue([]);

      await controller.getSessionEvents("42", 1000, 2000);

      expect(mockService.loadSessionChunk).toHaveBeenCalledWith(42, 1000, 2000);
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(
        controller.getSessionEvents("not-a-number"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
