import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DeviceInfoEntity, JobType, UserEntity } from "@remote-platform/entity";

import { UserProfileService } from "./user-profile.service";

describe("UserProfileService", () => {
  let service: UserProfileService;

  const mockTransactionManager = {
    create: vi.fn().mockImplementation((_entity, data) => data),
    save: vi
      .fn()
      .mockImplementation((data) =>
        Array.isArray(data)
          ? data.map((d, i) => ({ ...d, id: i + 1 }))
          : { ...data, id: 1 },
      ),
    remove: vi.fn(),
  };

  const mockUserRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    manager: {
      transaction: vi
        .fn()
        .mockImplementation((cb) => cb(mockTransactionManager)),
    },
  };

  const mockDeviceRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(DeviceInfoEntity),
          useValue: mockDeviceRepo,
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  const validCreateDto = {
    name: "Test User",
    username: "testuser",
    jobType: JobType.DEV,
    slackId: "U12345",
    empNo: "22010083",
    deviceInfoList: [{ deviceId: "device-1", name: "iPhone 15" }],
    ticketTemplateList: [],
  };

  describe("create", () => {
    it("should create a user profile successfully", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.findOne.mockResolvedValue(null);

      const result = await service.create(validCreateDto);

      expect(result).toBeDefined();
      expect(mockUserRepo.manager.transaction).toHaveBeenCalled();
    });

    it("should throw ConflictException for duplicate empNo", async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ empNo: "22010083" });

      await expect(service.create(validCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException for duplicate slackId", async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce(null) // empNo check
        .mockResolvedValueOnce({ slackId: "U12345", empNo: "99999999" }); // slackId check

      await expect(service.create(validCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException for duplicate deviceId", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.findOne.mockResolvedValue({ deviceId: "device-1" });

      await expect(service.create(validCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw for empty deviceId", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const dto = {
        ...validCreateDto,
        deviceInfoList: [{ deviceId: "", name: "Bad Device" }],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return a user by ID", async () => {
      const mockUser = {
        id: 1,
        name: "Test",
        empNo: "22010083",
        deviceInfoList: [],
        ticketTemplateList: [],
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when user not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOneByEmpNo", () => {
    it("should return a user by empNo", async () => {
      const mockUser = {
        id: 1,
        name: "Test",
        empNo: "22010083",
        deviceInfoList: [],
        ticketTemplateList: [],
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneByEmpNo("22010083");

      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when empNo not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneByEmpNo("00000000")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      mockUserRepo.find.mockResolvedValue([
        { id: 1, name: "User1", deviceInfoList: [], ticketTemplateList: [] },
        { id: 2, name: "User2", deviceInfoList: [], ticketTemplateList: [] },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no users", async () => {
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });
});
