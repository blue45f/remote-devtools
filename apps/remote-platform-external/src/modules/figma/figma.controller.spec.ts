import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";

import { FigmaController } from "./figma.controller";

describe("FigmaController", () => {
  let controller: FigmaController;
  const mockUserRepo = { findOne: vi.fn() };
  const mockDeviceRepo = { find: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FigmaController],
      providers: [
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(DeviceInfoEntity),
          useValue: mockDeviceRepo,
        },
      ],
    }).compile();
    controller = module.get<FigmaController>(FigmaController);
  });

  describe("registerUser", () => {
    it("should return error when username is missing", async () => {
      const result = await controller.registerUser({
        userId: "user-1",
        userName: "Test",
        timestamp: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("username-required");
    });

    it("should return mock user data when username is provided", async () => {
      const result = await controller.registerUser({
        userId: "user-1",
        userName: "Test",
        username: "testuser",
        timestamp: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
      expect(result.user?.username).toBe("testuser");
      expect(result.devices).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return success status", async () => {
      const result = await controller.healthCheck();
      expect(result.success).toBe(true);
      expect(result.message).toBe("Figma API is working");
    });
  });
});
