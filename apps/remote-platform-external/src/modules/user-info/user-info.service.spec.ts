import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DeviceInfoEntity } from "@remote-platform/entity";

import { UserInfoService } from "./user-info.service";

describe("UserInfoService (External)", () => {
  let service: UserInfoService;
  const mockDeviceRepo = { findOne: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInfoService,
        {
          provide: getRepositoryToken(DeviceInfoEntity),
          useValue: mockDeviceRepo,
        },
      ],
    }).compile();
    service = module.get<UserInfoService>(UserInfoService);
  });

  describe("getUserInfoByDeviceId", () => {
    it("should return user info when device and user exist", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          username: "testuser",
          name: "Test User",
          slackId: "U123",
          empNo: "22010083",
          jobType: "DEV",
          ticketTemplateList: [{ jiraProjectKey: "PROJ" }],
        },
      });

      const result = await service.getUserInfoByDeviceId("device-1");

      expect(result).toEqual(
        expect.objectContaining({
          deviceId: "device-1",
          username: "testuser",
          userDisplayName: "Test User",
          slackUserId: "U123",
          jiraProjectKey: "PROJ",
          jobType: "DEV",
        }),
      );
    });

    it("should return null when device not found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      const result = await service.getUserInfoByDeviceId("unknown");

      expect(result).toBeNull();
    });

    it("should return null when device has no user", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({ user: null });

      const result = await service.getUserInfoByDeviceId("orphan-device");

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      mockDeviceRepo.findOne.mockRejectedValue(new Error("DB error"));

      const result = await service.getUserInfoByDeviceId("device-1");

      expect(result).toBeNull();
    });

    it("should handle missing ticket templates", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          username: "notemplate",
          name: "No Template",
          slackId: "U999",
          empNo: "11111111",
          jobType: "QA",
          ticketTemplateList: [],
        },
      });

      const result = await service.getUserInfoByDeviceId("device-2");

      expect(result?.jiraProjectKey).toBeUndefined();
    });
  });
});
