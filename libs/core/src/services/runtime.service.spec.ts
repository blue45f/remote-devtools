import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { RuntimeEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";
import { RuntimeService } from "./runtime.service";

describe("RuntimeService", () => {
  let service: RuntimeService;
  let runtimeRepository: Repository<RuntimeEntity>;
  let recordService: RecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuntimeService,
        {
          provide: getRepositoryToken(RuntimeEntity),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: RecordService,
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RuntimeService>(RuntimeService);
    runtimeRepository = module.get<Repository<RuntimeEntity>>(
      getRepositoryToken(RuntimeEntity),
    );
    recordService = module.get<RecordService>(RecordService);
  });

  describe("create", () => {
    it("should return null when record not found", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue(null);

      const result = await service.create({
        recordId: 999,
        protocol: {},
        timestamp: 123,
      });

      expect(result).toBeNull();
    });

    it("should create and save runtime entry", async () => {
      const mockRecord = { id: 1 };
      vi.spyOn(recordService, "findOne").mockResolvedValue(mockRecord as any);
      vi.spyOn(runtimeRepository, "create").mockReturnValue({
        id: 5,
      } as any);
      vi.spyOn(runtimeRepository, "save").mockResolvedValue({
        id: 5,
      } as any);

      const result = await service.create({
        recordId: 1,
        protocol: { type: "log" },
        timestamp: 12345,
      });

      expect(runtimeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: { type: "log" },
          timestamp: 12345,
          record: mockRecord,
        }),
      );
      expect(result).toEqual({ id: 5 });
    });
  });

  describe("findByRecordId", () => {
    it("should find runtime entries ordered by timestamp ASC", async () => {
      vi.spyOn(runtimeRepository, "find").mockResolvedValue([]);

      await service.findByRecordId(1);

      expect(runtimeRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 } },
        order: { timestamp: "ASC" },
      });
    });
  });

  describe("findRuntimes", () => {
    it("should be an alias for findByRecordId", async () => {
      vi.spyOn(runtimeRepository, "find").mockResolvedValue([]);

      await service.findRuntimes(1);

      expect(runtimeRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 } },
        order: { timestamp: "ASC" },
      });
    });
  });
});
