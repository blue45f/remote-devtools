import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { BufferController } from "./buffer.controller";
import { WebviewGateway } from "./webview.gateway";

describe("BufferController", () => {
  let controller: BufferController;
  const mockGateway = { triggerBufferSave: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BufferController],
      providers: [{ provide: WebviewGateway, useValue: mockGateway }],
    }).compile();
    controller = module.get<BufferController>(BufferController);
  });

  describe("saveBuffer", () => {
    it("should save buffer and return success", async () => {
      mockGateway.triggerBufferSave.mockResolvedValue(true);

      const result = await controller.saveBuffer({
        deviceId: "device-123",
        trigger: "manual",
        timestamp: Date.now(),
      });

      expect(result).toEqual({ success: true });
      expect(mockGateway.triggerBufferSave).toHaveBeenCalledWith(
        "device-123",
        "manual",
        undefined,
        expect.any(Number),
        undefined,
        undefined,
      );
    });

    it("should throw BadRequestException when deviceId is missing", async () => {
      await expect(controller.saveBuffer({})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when deviceId is empty string", async () => {
      await expect(
        controller.saveBuffer({ deviceId: "   " }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return success:false when gateway returns false", async () => {
      mockGateway.triggerBufferSave.mockResolvedValue(false);

      const result = await controller.saveBuffer({ deviceId: "device-123" });

      expect(result).toEqual({ success: false });
    });

    it("should pass all optional params to gateway", async () => {
      mockGateway.triggerBufferSave.mockResolvedValue(true);

      await controller.saveBuffer({
        deviceId: "dev-1",
        trigger: "visibility",
        title: "Test Page",
        timestamp: 1000,
        room: "Buffer-room",
        url: "https://example.com",
      });

      expect(mockGateway.triggerBufferSave).toHaveBeenCalledWith(
        "dev-1",
        "visibility",
        "Test Page",
        1000,
        "Buffer-room",
        "https://example.com",
      );
    });
  });
});
