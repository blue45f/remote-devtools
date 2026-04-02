import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach } from "vitest";

import { S3PlaybackService } from "./s3-playback.service";

describe("S3PlaybackService", () => {
  let service: S3PlaybackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3PlaybackService],
    }).compile();
    service = module.get<S3PlaybackService>(S3PlaybackService);
  });

  describe("cache management", () => {
    it("should initialize and clear client caches", () => {
      const mockClient = {} as any;
      service.initializeClientCaches(mockClient, [{ test: true }]);

      expect(service.getBackupCache(mockClient)).toHaveLength(1);
      expect(service.getResponseBodyCache(mockClient)).toBeDefined();

      service.clearClientCaches(mockClient);

      expect(service.getBackupCache(mockClient)).toBeUndefined();
      expect(service.getResponseBodyCache(mockClient)).toBeUndefined();
    });
  });

  describe("extractSessionStartTime", () => {
    it("should extract sessionStartTime", () => {
      const data = [{ sessionStartTime: 1000, timestamp: 2000 }];
      expect(service.extractSessionStartTime(data)).toBe(1000);
    });

    it("should fallback to first timestamp", () => {
      const data = [{ timestamp: 5000 }];
      expect(service.extractSessionStartTime(data)).toBe(5000);
    });

    it("should return null for empty data", () => {
      expect(service.extractSessionStartTime([])).toBeNull();
    });
  });

  describe("generateS3SessionId", () => {
    it("should generate ID with deviceId and timestamp", () => {
      const id = service.generateS3SessionId("device-1", 1000);
      expect(id).toContain("device-1");
      expect(id).toContain("1000");
    });

    it("should return null when no timestamp", () => {
      expect(service.generateS3SessionId("device-1", null)).toBeNull();
    });
  });

  describe("classifyBackupEvents", () => {
    it("should classify events by type", () => {
      const backupData = [
        {
          bufferData: [
            {
              method: "Network.requestWillBeSent",
              params: { requestId: 1 },
              timestamp: 1,
            },
            { method: "Runtime.consoleAPICalled", params: {}, timestamp: 2 },
          ],
        },
      ];
      const result = service.classifyBackupEvents(backupData, new Map());
      expect(result.networkProtocols.length).toBeGreaterThanOrEqual(1);
      expect(result.runtimeProtocols.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle empty data", () => {
      const result = service.classifyBackupEvents([], new Map());
      expect(result.networkProtocols).toHaveLength(0);
    });
  });

  describe("sortProtocolsByTimestamp", () => {
    it("should sort by timestamp ascending", () => {
      const protocols = [
        { protocol: {}, timestamp: 3000 },
        { protocol: {}, timestamp: 1000 },
        { protocol: {}, timestamp: 2000 },
      ];
      const sorted = service.sortProtocolsByTimestamp(protocols);
      expect(Number(sorted[0].timestamp)).toBeLessThanOrEqual(
        Number(sorted[1].timestamp),
      );
    });
  });

  describe("findDomDataInS3Cache", () => {
    it("should return null when no cache", () => {
      const mockClient = {} as any;
      expect(service.findDomDataInS3Cache(mockClient)).toBeNull();
    });
  });

  describe("findScreenDataInS3Cache", () => {
    it("should return null when no cache", () => {
      const mockClient = {} as any;
      expect(service.findScreenDataInS3Cache(mockClient)).toBeNull();
    });
  });
});
