import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { NetworkEntity } from "@remote-platform/entity";

import { NetworkService } from "./network.service";
import { RecordService } from "./record.service";

describe("NetworkService", () => {
  let service: NetworkService;
  let networkRepository: Repository<NetworkEntity>;
  let recordService: RecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkService,
        {
          provide: getRepositoryToken(NetworkEntity),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
            findOne: vi.fn(),
            insert: vi.fn(),
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

    service = module.get<NetworkService>(NetworkService);
    networkRepository = module.get<Repository<NetworkEntity>>(
      getRepositoryToken(NetworkEntity),
    );
    recordService = module.get<RecordService>(RecordService);
  });

  describe("create", () => {
    it("should return null when recordId is missing", async () => {
      const result = await service.create({ url: "http://test.com" });
      expect(result).toBeNull();
    });

    it("should return null when record not found", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue(null);

      const result = await service.create({
        recordId: 999,
        requestId: 1,
        timestamp: 123,
      });

      expect(result).toBeNull();
    });

    it("should return null when requestId is not a valid number", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);

      const result = await service.create({
        recordId: 1,
        requestId: NaN,
        timestamp: 123,
      });

      expect(result).toBeNull();
    });

    it("should create and save a network entry", async () => {
      const mockRecord = { id: 1 };
      vi.spyOn(recordService, "findOne").mockResolvedValue(mockRecord as any);
      vi.spyOn(networkRepository, "create").mockReturnValue({
        id: 10,
      } as any);
      vi.spyOn(networkRepository, "save").mockResolvedValue({
        id: 10,
      } as any);

      const result = await service.create({
        recordId: 1,
        requestId: 42,
        timestamp: 12345,
        url: "http://example.com",
      });

      expect(networkRepository.create).toHaveBeenCalled();
      expect(networkRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 10 });
    });
  });

  describe("findByRecordId", () => {
    it("should find network entries ordered by timestamp ASC", async () => {
      vi.spyOn(networkRepository, "find").mockResolvedValue([]);

      await service.findByRecordId(1);

      expect(networkRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 } },
        order: { timestamp: "ASC" },
      });
    });
  });

  describe("findNetworks", () => {
    it("should be an alias for findByRecordId", async () => {
      vi.spyOn(networkRepository, "find").mockResolvedValue([]);

      await service.findNetworks(1);

      expect(networkRepository.find).toHaveBeenCalledWith({
        where: { record: { id: 1 } },
        order: { timestamp: "ASC" },
      });
    });
  });

  describe("updateResponseBody", () => {
    it("should throw when record not found", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue(null);

      await expect(
        service.updateResponseBody({
          recordId: 999,
          requestId: 1,
          body: "test",
          base64Encoded: false,
        }),
      ).rejects.toThrow();
    });

    it("should find existing network entry and update its body", async () => {
      const mockNetwork = { id: 10, requestId: 42 } as any;
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(networkRepository, "findOne").mockResolvedValue(mockNetwork);
      vi.spyOn(networkRepository, "save").mockResolvedValue(mockNetwork);

      await service.updateResponseBody({
        recordId: 1,
        requestId: 42,
        body: '{"key":  "value" }',
        base64Encoded: false,
      });

      expect(mockNetwork.responseBody).toBe('{"key":"value"}');
      expect(mockNetwork.base64Encoded).toBe(false);
      expect(networkRepository.save).toHaveBeenCalledWith(mockNetwork);
    });

    it("should keep base64 body as-is", async () => {
      const mockNetwork = { id: 10, requestId: 42 } as any;
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(networkRepository, "findOne").mockResolvedValue(mockNetwork);
      vi.spyOn(networkRepository, "save").mockResolvedValue(mockNetwork);

      await service.updateResponseBody({
        recordId: 1,
        requestId: 42,
        body: "SGVsbG8=",
        base64Encoded: true,
      });

      expect(mockNetwork.responseBody).toBe("SGVsbG8=");
      expect(mockNetwork.base64Encoded).toBe(true);
      expect(networkRepository.save).toHaveBeenCalledWith(mockNetwork);
    });

    it("should keep non-JSON body as-is", async () => {
      const mockNetwork = { id: 10, requestId: 42 } as any;
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(networkRepository, "findOne").mockResolvedValue(mockNetwork);
      vi.spyOn(networkRepository, "save").mockResolvedValue(mockNetwork);

      await service.updateResponseBody({
        recordId: 1,
        requestId: 42,
        body: "<html>not json</html>",
        base64Encoded: false,
      });

      expect(mockNetwork.responseBody).toBe("<html>not json</html>");
      expect(networkRepository.save).toHaveBeenCalledWith(mockNetwork);
    });

    it("should return without saving when network entry not found after retries", async () => {
      vi.spyOn(recordService, "findOne").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(networkRepository, "findOne").mockResolvedValue(null);

      await service.updateResponseBody({
        recordId: 1,
        requestId: 42,
        body: "test",
        base64Encoded: false,
      });

      expect(networkRepository.save).not.toHaveBeenCalled();
    }, 10000);
  });
});
