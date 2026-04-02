import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { UserProfileController } from "./user-profile.controller";
import { UserProfileService } from "./user-profile.service";

describe("UserProfileController", () => {
  let controller: UserProfileController;
  const mockService = {
    findOneByEmpNo: vi.fn(),
    upsertByEmpNo: vi.fn(),
    removeByEmpNo: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [{ provide: UserProfileService, useValue: mockService }],
    }).compile();
    controller = module.get<UserProfileController>(UserProfileController);
  });

  describe("findOne", () => {
    it("should return user profile by empNo", async () => {
      const mockProfile = { id: 1, name: "Test", empNo: "22010083" };
      mockService.findOneByEmpNo.mockResolvedValue(mockProfile);

      const result = await controller.findOne("22010083");

      expect(result).toEqual({ success: true, data: mockProfile });
      expect(mockService.findOneByEmpNo).toHaveBeenCalledWith("22010083");
    });

    it("should propagate NotFoundException", async () => {
      mockService.findOneByEmpNo.mockRejectedValue(
        new NotFoundException("User not found"),
      );

      await expect(controller.findOne("00000000")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("upsert", () => {
    it("should create new user profile", async () => {
      const mockResult = {
        user: { id: 1, name: "New User", empNo: "22010083" },
        created: true,
      };
      mockService.upsertByEmpNo.mockResolvedValue(mockResult);

      const dto = {
        name: "New User",
        username: "newuser",
        jobType: "DEV" as any,
        empNo: "22010083",
        email: "test@test.com",
      };
      const result = await controller.upsert("22010083", dto);

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.data).toEqual(mockResult.user);
    });

    it("should update existing user profile", async () => {
      const mockResult = {
        user: { id: 1, name: "Updated", empNo: "22010083" },
        created: false,
      };
      mockService.upsertByEmpNo.mockResolvedValue(mockResult);

      const dto = {
        name: "Updated",
        username: "user",
        jobType: "QA" as any,
        empNo: "22010083",
        email: "t@t.com",
      };
      const result = await controller.upsert("22010083", dto);

      expect(result.created).toBe(false);
    });
  });

  describe("remove", () => {
    it("should delete user profile", async () => {
      mockService.removeByEmpNo.mockResolvedValue(undefined);

      await expect(controller.remove("22010083")).resolves.toBeUndefined();
      expect(mockService.removeByEmpNo).toHaveBeenCalledWith("22010083");
    });

    it("should propagate NotFoundException for missing user", async () => {
      mockService.removeByEmpNo.mockRejectedValue(
        new NotFoundException("User not found"),
      );

      await expect(controller.remove("00000000")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
