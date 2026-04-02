import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, HttpException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { JiraController } from "./jira.controller";
import { JiraService } from "./jira.service";

describe("JiraController", () => {
  let controller: JiraController;
  const mockJiraService = { uploadImageToJira: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraController],
      providers: [{ provide: JiraService, useValue: mockJiraService }],
    }).compile();
    controller = module.get<JiraController>(JiraController);
  });

  describe("uploadImageToJira", () => {
    it("should upload image successfully", async () => {
      mockJiraService.uploadImageToJira.mockResolvedValue({ id: "att-1" });

      const result = await controller.uploadImageToJira("PROJ-123", {
        buffer: Buffer.from("png-data"),
        originalname: "screenshot.png",
        mimetype: "image/png",
      } as Express.Multer.File);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Image uploaded successfully");
      expect(mockJiraService.uploadImageToJira).toHaveBeenCalledWith(
        "PROJ-123",
        expect.objectContaining({ mimetype: "image/png" }),
      );
    });

    it("should throw BadRequestException when no file", async () => {
      await expect(
        controller.uploadImageToJira("PROJ-123", undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw HttpException on service error with status", async () => {
      mockJiraService.uploadImageToJira.mockRejectedValue({
        message: "Forbidden",
        response: { status: 403, data: "Access denied" },
      });

      await expect(
        controller.uploadImageToJira("PROJ-123", {
          buffer: Buffer.from("x"),
          originalname: "img.png",
          mimetype: "image/png",
        } as Express.Multer.File),
      ).rejects.toThrow(HttpException);
    });

    it("should throw 500 on unknown service error", async () => {
      mockJiraService.uploadImageToJira.mockRejectedValue(
        new Error("Network timeout"),
      );

      await expect(
        controller.uploadImageToJira("PROJ-123", {
          buffer: Buffer.from("x"),
          originalname: "img.png",
          mimetype: "image/png",
        } as Express.Multer.File),
      ).rejects.toThrow(HttpException);
    });
  });
});
