import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DataSource } from "typeorm";

import { RemoveRecordService } from "./remove-record.service";

describe("RemoveRecordService", () => {
  let service: RemoveRecordService;

  const mockQueryRunner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    query: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };

  const mockDataSource = {
    createQueryRunner: vi.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveRecordService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RemoveRecordService>(RemoveRecordService);
  });

  describe("removeRecordOldRecords", () => {
    it("should delete old records and commit", async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: "42" }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM record"),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should rollback on error", async () => {
      mockQueryRunner.query.mockRejectedValue(new Error("DB error"));

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should exclude protected record ID 3462", async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: "0" }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("id <> 3462"),
      );
    });

    it("should use batch size of 1000", async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: "0" }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT 1000"),
      );
    });

    it("should use 14-day retention period", async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: "0" }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '14 days'"),
      );
    });
  });
});
