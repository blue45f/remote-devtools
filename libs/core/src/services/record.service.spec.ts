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

  describe("findPaginated", () => {
    function makeQB(rows: Partial<RecordEntity>[]) {
      const calls: Record<string, unknown[]> = {};
      const qb: Partial<SelectQueryBuilder<RecordEntity>> & {
        calls: Record<string, unknown[]>;
      } = {
        calls,
        orderBy: vi.fn().mockImplementation(function (this: typeof qb, k, d) {
          calls.orderBy = [k, d];
          return this;
        }) as unknown as SelectQueryBuilder<RecordEntity>["orderBy"],
        limit: vi.fn().mockImplementation(function (this: typeof qb, n) {
          calls.limit = [n];
          return this;
        }) as unknown as SelectQueryBuilder<RecordEntity>["limit"],
        andWhere: vi.fn().mockImplementation(function (
          this: typeof qb,
          sql: string,
          params: Record<string, unknown>,
        ) {
          (calls.andWhere ??= [] as unknown[]).push({ sql, params });
          return this;
        }) as unknown as SelectQueryBuilder<RecordEntity>["andWhere"],
        getMany: vi.fn().mockResolvedValue(rows),
      };
      return qb;
    }

    it("returns rows + null cursor when fewer than limit results", async () => {
      const qb = makeQB([
        { id: 1, timestamp: new Date("2026-04-27T10:00:00Z") },
      ]);
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(
        qb as unknown as SelectQueryBuilder<RecordEntity>,
      );

      const out = await service.findPaginated({ limit: 50 });
      expect(out.rows).toHaveLength(1);
      expect(out.nextCursor).toBeNull();
      expect(qb.calls.limit).toEqual([51]); // peek one extra
    });

    it("returns nextCursor (timestamp ISO) when there's a next page", async () => {
      // Service slices to `limit` and uses last row for cursor.
      const rows = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        timestamp: new Date(`2026-04-27T10:0${5 - i}:00Z`),
      }));
      const qb = makeQB(rows);
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(
        qb as unknown as SelectQueryBuilder<RecordEntity>,
      );

      const out = await service.findPaginated({ limit: 5 });
      expect(out.rows).toHaveLength(5);
      expect(out.nextCursor).toBe(rows[4].timestamp!.toISOString());
    });

    it("clamps limit between 1 and 200", async () => {
      const qb = makeQB([]);
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(
        qb as unknown as SelectQueryBuilder<RecordEntity>,
      );

      await service.findPaginated({ limit: 9999 });
      expect(qb.calls.limit).toEqual([201]); // 200 + 1 peek

      await service.findPaginated({ limit: 0 });
      expect(qb.calls.limit).toEqual([2]); // 1 + 1 peek
    });

    it("applies q / deviceId / recordMode / orgId / cursor filters", async () => {
      const qb = makeQB([]);
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(
        qb as unknown as SelectQueryBuilder<RecordEntity>,
      );

      await service.findPaginated({
        q: "  Checkout  ",
        deviceId: "device-1",
        recordMode: true,
        orgId: "org-uuid",
        cursor: "2026-04-27T00:00:00.000Z",
      });

      const where = qb.calls.andWhere as { sql: string; params: unknown }[];
      expect(where).toHaveLength(5);
      expect(where[0].params).toEqual({ q: "%checkout%" });
      expect(where[1].params).toEqual({ did: "device-1" });
      expect(where[2].params).toEqual({ rm: true });
      expect(where[3].params).toEqual({ oid: "org-uuid" });
      const cursorParam = where[4].params as { cur: Date };
      expect(cursorParam.cur).toBeInstanceOf(Date);
      expect(cursorParam.cur.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    });

    it("skips empty filters", async () => {
      const qb = makeQB([]);
      vi.spyOn(repository, "createQueryBuilder").mockReturnValue(
        qb as unknown as SelectQueryBuilder<RecordEntity>,
      );

      await service.findPaginated({
        q: "   ", // whitespace only
        deviceId: "",
        recordMode: undefined,
        orgId: null,
      });

      expect(qb.calls.andWhere).toBeUndefined();
    });
  });
});
