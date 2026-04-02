import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ScreenService } from "@remote-platform/core";

import { BufferService } from "../buffer/buffer.service";
import { S3Service } from "../s3/s3.service";
import { CdpEventPersistenceService } from "./cdp-event-persistence.service";
import { BufferFlushService } from "./buffer-flush.service";

describe("BufferFlushService", () => {
  let service: BufferFlushService;
  const mockBufferService = { getBuffer: vi.fn(), flush: vi.fn(), getBufferSize: vi.fn() };
  const mockS3Service = { uploadBufferData: vi.fn(), saveBufferDataToFile: vi.fn() };
  const mockScreenService = { upsert: vi.fn() };
  const mockCdpPersistence = {
    persistBufferedEvent: vi.fn(),
    persistLatestScreenPreview: vi.fn(),
    toTimestampNs: vi.fn().mockReturnValue(1000000000),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BufferFlushService,
        { provide: BufferService, useValue: mockBufferService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: ScreenService, useValue: mockScreenService },
        { provide: CdpEventPersistenceService, useValue: mockCdpPersistence },
      ],
    }).compile();
    service = module.get<BufferFlushService>(BufferFlushService);
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("triggerBufferSave", () => {
    it("should be a public method", () => {
      expect(service.triggerBufferSave).toBeDefined();
    });
  });

  describe("flushBufferToFile", () => {
    it("should be a public method", () => {
      expect(service.flushBufferToFile).toBeDefined();
    });
  });

  describe("flushBufferToFileForce", () => {
    it("should be a public method", () => {
      expect(service.flushBufferToFileForce).toBeDefined();
    });
  });

  describe("transferBufferedDataToRecord", () => {
    it("should be a public method", () => {
      expect(service.transferBufferedDataToRecord).toBeDefined();
    });
  });
});
