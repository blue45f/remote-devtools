import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { S3Service } from "./s3.service";

// Mock fs and AWS SDK
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    readdir: vi.fn().mockResolvedValue([]),
  },
  statSync: vi.fn().mockReturnValue({ size: 100 }),
  readdirSync: vi.fn().mockReturnValue([]),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

describe("S3Service (External)", () => {
  let service: S3Service;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();
    service = module.get<S3Service>(S3Service);
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("public API", () => {
    it("should have uploadBufferData", () => {
      expect(service.uploadBufferData).toBeDefined();
    });

    it("should have saveBufferDataToFile", () => {
      expect(service.saveBufferDataToFile).toBeDefined();
    });

    it("should have getS3BackupData", () => {
      expect(service.getS3BackupData).toBeDefined();
    });

    it("should have listBackupFiles", () => {
      expect(service.listBackupFiles).toBeDefined();
    });

    it("should have getBufferDataByDevice", () => {
      expect(service.getBufferDataByDevice).toBeDefined();
    });

    it("should have getPreviousSessionData", () => {
      expect(service.getPreviousSessionData).toBeDefined();
    });
  });
});
