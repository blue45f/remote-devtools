import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DeviceInfoEntity } from "@remote-platform/entity";

import { UserInfoService } from "./user-info.service";

describe("UserInfoService (Internal)", () => {
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
    it("should return user info", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          username: "admin",
          name: "Admin User",
          slackId: "U456",
          empNo: "33030033",
          jobType: "PM",
          ticketTemplateList: [{ jiraProjectKey: "ADMIN" }],
        },
      });

      const result = await service.getUserInfoByDeviceId("dev-internal");

      expect(result).toEqual(
        expect.objectContaining({
          deviceId: "dev-internal",
          username: "admin",
          jiraProjectKey: "ADMIN",
        }),
      );
    });

    it("should return null for unknown device", async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);
      expect(await service.getUserInfoByDeviceId("x")).toBeNull();
    });
  });

  describe("getTicketFormData", () => {
    it("should return structured sheet data from first template", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          name: "User",
          empNo: "12345678",
          ticketTemplateList: [
            {
              name: "Bug",
              titlePrefix: "[Bug]",
              epicTicket: "PROJ-1",
              assigneeInfoList: [
                { username: "dev1", displayName: "Dev One", email: "d@e.com" },
              ],
              componentList: ["Frontend"],
              labelList: ["bug", "p1"],
            },
          ],
        },
      });

      const result = await service.getTicketFormData("device-1");

      expect(result.columns).toHaveLength(5); // Title, Epic, Assignee, Component, Label
      expect(result.totalColumns).toBe(5);
      expect(result.columns[0].header).toBe("Title");
      expect(result.columns[0].values[0].text).toBe("[Bug]");
      expect(result.columns[2].header).toBe("Assignee");
      expect(result.columns[2].values[0].userData?.username).toBe("dev1");
    });

    it("should use last selected template when set", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          name: "User",
          empNo: "12345678",
          lastSelectedTemplateName: "Feature",
          ticketTemplateList: [
            { name: "Bug", titlePrefix: "[Bug]" },
            { name: "Feature", titlePrefix: "[Feat]" },
          ],
        },
      });

      const result = await service.getTicketFormData("device-1");

      expect(result.columns[0].values[0].text).toBe("[Feat]");
    });

    it("should throw when no user found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.getTicketFormData("unknown")).rejects.toThrow(
        "User information not found",
      );
    });

    it("should throw when no template found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: { name: "User", empNo: "12345678", ticketTemplateList: [] },
      });

      await expect(service.getTicketFormData("device-1")).rejects.toThrow(
        "No ticket template found",
      );
    });
  });

  describe("getTicketFormDataByTemplate", () => {
    it("should return data for specific template", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          name: "User",
          empNo: "12345678",
          ticketTemplateList: [
            { name: "Bug", titlePrefix: "[Bug]" },
            { name: "Feature", titlePrefix: "[Feat]", epicTicket: "PROJ-100" },
          ],
        },
      });

      const result = await service.getTicketFormDataByTemplate(
        "device-1",
        "Feature",
      );

      expect(result.columns[0].values[0].text).toBe("[Feat]");
    });

    it("should throw when template not found", async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        user: {
          name: "User",
          empNo: "12345678",
          ticketTemplateList: [{ name: "Bug" }],
        },
      });

      await expect(
        service.getTicketFormDataByTemplate("device-1", "NonExistent"),
      ).rejects.toThrow("Template 'NonExistent' not found");
    });
  });
});
