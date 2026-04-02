import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ScreenEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";
import { ScreenService } from "./screen.service";

describe("ScreenService", () => {
  let service: ScreenService;
  let screenRepository: Repository<ScreenEntity>;
  let recordService: RecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenService,
        {
          provide: getRepositoryToken(ScreenEntity),
          useValue: {
            find: vi.fn(),
            findOne: vi.fn(),
            upsert: vi.fn(),
            save: vi.fn(),
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

    service = module.get<ScreenService>(ScreenService);
    screenRepository = module.get<Repository<ScreenEntity>>(
      getRepositoryToken(ScreenEntity),
    );
    recordService = module.get<RecordService>(RecordService);
  });

  describe("upsert", () => {
    it("should return null when record not found", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue(null);

      const result = await service.upsert({
        recordId: 999,
        protocol: {},
        timestamp: 123,
      });

      expect(result).toBeNull();
    });

    it("should upsert screen entry with screenPreview type", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(screenRepository, "upsert").mockResolvedValue({
        generatedMaps: [{ id: 20 }],
      } as any);
      vi.spyOn(screenRepository, "findOne").mockResolvedValue({
        id: 20,
      } as any);

      const result = await service.upsert({
        recordId: 1,
        protocol: { data: "screenshot" },
        timestamp: 12345,
      });

      expect(screenRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ type: "screenPreview" }),
        expect.any(Object),
      );
      expect(result).toEqual({ id: 20 });
    });
  });

  describe("findByRecordId", () => {
    it("should find non-preview screens ordered by timestamp ASC", async () => {
      vi.spyOn(screenRepository, "find").mockResolvedValue([]);

      await service.findByRecordId(1);

      expect(screenRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 }, type: null },
        order: { timestamp: "ASC" },
      });
    });
  });

  describe("findLatest", () => {
    it("should find latest screenPreview ordered by timestamp DESC", async () => {
      vi.spyOn(screenRepository, "findOne").mockResolvedValue(null);

      await service.findLatest(1);

      expect(screenRepository.findOne).toHaveBeenCalledWith({
        where: { record: { id: 1 }, type: "screenPreview" },
        order: { timestamp: "DESC" },
      });
    });
  });

  describe("alias methods", () => {
    it("findScreens should be an alias for findByRecordId", async () => {
      vi.spyOn(screenRepository, "find").mockResolvedValue([]);

      await service.findScreens(1);

      expect(screenRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 }, type: null },
        order: { timestamp: "ASC" },
      });
    });

    it("findLatestScreen should be an alias for findLatest", async () => {
      vi.spyOn(screenRepository, "findOne").mockResolvedValue(null);

      await service.findLatestScreen(1);

      expect(screenRepository.findOne).toHaveBeenCalledWith({
        where: { record: { id: 1 }, type: "screenPreview" },
        order: { timestamp: "DESC" },
      });
    });
  });
});
