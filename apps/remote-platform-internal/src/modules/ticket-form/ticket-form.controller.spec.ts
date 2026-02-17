import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";
import { BusinessException } from "@remote-platform/common";

import { TicketFormController } from "./ticket-form.controller";
import { UserInfoService } from "../user-info/user-info.service";

describe("TicketFormController", () => {
  let controller: TicketFormController;
  const mockUserInfoService = {
    getTicketFormData: vi.fn(),
    getTicketFormDataByTemplate: vi.fn(),
  };
  const mockDeviceRepo = {
    findOne: vi.fn(),
    manager: { update: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketFormController],
      providers: [
        { provide: UserInfoService, useValue: mockUserInfoService },
        { provide: getRepositoryToken(DeviceInfoEntity), useValue: mockDeviceRepo },
      ],
    }).compile();

    controller = module.get<TicketFormController>(TicketFormController);
  });

  describe("getTicketFormData", () => {
    it("should return ticket form data", async () => {
      const mockData = { templates: [], assignees: [] };
      mockUserInfoService.getTicketFormData.mockResolvedValue(mockData);

      const result = await controller.getTicketFormData("device-123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.time).toBeGreaterThanOrEqual(0);
    });

    it("should use LOCAL_DEVICE_ID for test deviceId", async () => {
      process.env.LOCAL_DEVICE_ID = "local-dev-device";
      mockUserInfoService.getTicketFormData.mockResolvedValue({});

      await controller.getTicketFormData("test");

      expect(mockUserInfoService.getTicketFormData).toHaveBeenCalledWith(
        "local-dev-device",
      );
      delete process.env.LOCAL_DEVICE_ID;
    });

    it("should propagate BusinessException", async () => {
      mockUserInfoService.getTicketFormData.mockRejectedValue(
        BusinessException.deviceNotFound({ deviceId: "bad-device" }),
      );

      await expect(
        controller.getTicketFormData("bad-device"),
      ).rejects.toThrow(BusinessException);
    });

    it("should wrap unknown errors in internalError", async () => {
      mockUserInfoService.getTicketFormData.mockRejectedValue(
        new Error("DB connection lost"),
      );

      await expect(
        controller.getTicketFormData("device-123"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("getUserTemplates", () => {
    it("should return user templates with last selected", async () => {
      const mockDevice = {
        user: {
          id: 1,
          lastSelectedTemplateName: "Bug Template",
          ticketTemplateList: [
            {
              id: 1,
              name: "Bug Template",
              jiraProjectKey: "PROJ",
              componentList: [],
              labelList: [],
            },
          ],
        },
      };
      mockDeviceRepo.findOne.mockResolvedValue(mockDevice);

      const result = await controller.getUserTemplates("device-123");

      expect(result.success).toBe(true);
      expect(result.data?.ticketTemplateList).toHaveLength(1);
      expect(result.data?.lastSelectedTemplate?.name).toBe("Bug Template");
    });

    it("should throw when device not found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getUserTemplates("nonexistent"),
      ).rejects.toThrow(BusinessException);
    });

    it("should throw when device has no user", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({ user: null });

      await expect(
        controller.getUserTemplates("device-123"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("selectTemplate", () => {
    it("should update last selected template", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          id: 1,
          ticketTemplateList: [{ name: "Bug Template" }],
        },
      });
      mockDeviceRepo.manager.update.mockResolvedValue({});

      const result = await controller.selectTemplate({
        deviceId: "device-123",
        templateName: "Bug Template",
      });

      expect(result.success).toBe(true);
      expect(mockDeviceRepo.manager.update).toHaveBeenCalledWith(
        UserEntity,
        1,
        { lastSelectedTemplateName: "Bug Template" },
      );
    });

    it("should throw when template not found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          id: 1,
          ticketTemplateList: [{ name: "Other Template" }],
        },
      });

      await expect(
        controller.selectTemplate({
          deviceId: "device-123",
          templateName: "Nonexistent",
        }),
      ).rejects.toThrow(BusinessException);
    });
  });
});
