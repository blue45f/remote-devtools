import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository, SelectQueryBuilder } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { RecordEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

describe("RecordService", () => {
  let service: RecordService;
  let repository: Repository<RecordEntity>;

  const mockRecord: Partial<RecordEntity> = {
    id: 1,
    name: "test-session",
    deviceId: "device-123",
    timestamp: new Date("2024-01-01"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        {
          provide: getRepositoryToken(RecordEntity),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
            findOne: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            createQueryBuilder: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
    repository = module.get<Repository<RecordEntity>>(
      getRepositoryToken(RecordEntity),
    );
  });

  describe("create", () => {
    it("should create and save a record", async () => {
      vi.spyOn(repository, "create").mockReturnValue(
        mockRecord as RecordEntity,
      );
      vi.spyOn(repository, "save").mockResolvedValue(
        mockRecord as RecordEntity,
      );

      const result = await service.create({ name: "test-session" });

      expect(repository.create).toHaveBeenCalledWith({ name: "test-session" });
      expect(repository.save).toHaveBeenCalledWith(mockRecord);
      expect(result.id).toBe(1);
    });
  });

  describe("findOne", () => {
    it("should find a record by id", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(
        mockRecord as RecordEntity,
      );

      const result = await service.findOne(1);
      expect(result).toEqual(mockRecord);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should return null if record not found", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(null);

      const result = await service.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all records", async () => {
      vi.spyOn(repository, "find").mockResolvedValue([
        mockRecord as RecordEntity,
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe("findPreviousByDeviceId", () => {
    it("should return empty array if current record not found", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(null);

      const result = await service.findPreviousByDeviceId("device-123", 999);
      expect(result).toEqual([]);
    });

    it("should query previous records by device and timestamp", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(
        mockRecord as RecordEntity,
      );

      const mockQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<RecordEntity>;
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(mockQb);

      const result = await service.findPreviousByDeviceId("device-123", 1);

      expect(mockQb.where).toHaveBeenCalledWith(
        "record.device_id = :deviceId",
        { deviceId: "device-123" },
      );
      expect(mockQb.orderBy).toHaveBeenCalledWith("record.timestamp", "DESC");
      expect(result).toEqual([]);
    });
  });

  describe("findWithNetworks", () => {
    it("should find record with networks relation", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(
        mockRecord as RecordEntity,
      );

      await service.findWithNetworks(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["networks"],
      });
    });
  });

  describe("updateDuration", () => {
    it("should update the duration", async () => {
      vi.spyOn(repository, "update").mockResolvedValue({} as any);

      await service.updateDuration(1, 5000000000);

      expect(repository.update).toHaveBeenCalledWith(1, {
        duration: 5000000000,
      });
    });
  });

  describe("delete", () => {
    it("should delete the record", async () => {
      vi.spyOn(repository, "delete").mockResolvedValue({} as any);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
