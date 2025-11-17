import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MSG_ID } from "@remote-platform/constants";
import { DomEntity } from "@remote-platform/entity";

import { DomService } from "./dom.service";
import { RecordService } from "./record.service";

describe("DomService", () => {
  let service: DomService;
  let domRepository: Repository<DomEntity>;
  let recordService: RecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomService,
        {
          provide: getRepositoryToken(DomEntity),
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

    service = module.get<DomService>(DomService);
    domRepository = module.get<Repository<DomEntity>>(
      getRepositoryToken(DomEntity),
    );
    recordService = module.get<RecordService>(RecordService);
  });

  describe("isEnableDomResponseMessage", () => {
    it("should return true for DOM.ENABLE id", () => {
      expect(service.isEnableDomResponseMessage(MSG_ID.DOM.ENABLE)).toBe(true);
    });

    it("should return false for other ids", () => {
      expect(service.isEnableDomResponseMessage(999)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(service.isEnableDomResponseMessage(undefined)).toBe(false);
    });
  });

  describe("isGetDomResponseMessage", () => {
    it("should return true for DOM.GET_DOCUMENT id", () => {
      expect(service.isGetDomResponseMessage(MSG_ID.DOM.GET_DOCUMENT)).toBe(
        true,
      );
    });

    it("should return false for other ids", () => {
      expect(service.isGetDomResponseMessage(1)).toBe(false);
    });
  });

  describe("isGetDomRequestMessage", () => {
    it("should return true for DOM.getDocument method", () => {
      expect(
        service.isGetDomRequestMessage({ method: "DOM.getDocument" }),
      ).toBe(true);
    });

    it("should return false for other methods", () => {
      expect(service.isGetDomRequestMessage({ method: "Network.enable" })).toBe(
        false,
      );
    });
  });

  describe("upsert", () => {
    it("should return null when record not found", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue(null);

      const result = await service.upsert({
        recordId: 999,
        type: "entireDom",
        protocol: {},
        timestamp: Date.now(),
      });

      expect(result).toBeNull();
    });

    it("should upsert DOM entry when record exists", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(domRepository, "upsert").mockResolvedValue({
        generatedMaps: [{ id: 10 }],
      } as any);
      vi.spyOn(domRepository, "findOne").mockResolvedValue({ id: 10 } as any);

      const result = await service.upsert({
        recordId: 1,
        type: "entireDom",
        protocol: { nodeId: 1 },
        timestamp: 12345,
      });

      expect(domRepository.upsert).toHaveBeenCalled();
      expect(result).toEqual({ id: 10 });
    });
  });

  describe("findByRecordId", () => {
    it("should find DOM entries ordered by timestamp ASC", async () => {
      vi.spyOn(domRepository, "find").mockResolvedValue([]);

      await service.findByRecordId(1);

      expect(domRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 } },
        order: { timestamp: "ASC" },
      });
    });
  });

  describe("findEntireDom", () => {
    it("should find entire DOM snapshot by record id", async () => {
      vi.spyOn(domRepository, "findOne").mockResolvedValue(null);

      await service.findEntireDom(1);

      expect(domRepository.findOne).toHaveBeenCalledWith({
        where: { record: { id: 1 }, type: "entireDom" },
      });
    });
  });
});
