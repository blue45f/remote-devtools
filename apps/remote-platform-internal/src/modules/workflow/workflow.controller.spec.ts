import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { WorkflowController } from "./workflow.controller";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import axios from "axios";

describe("WorkflowController", () => {
  let controller: WorkflowController;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.WORKFLOW_API_URL = "http://workflow-api";
    process.env.JIRA_HOST_URL = "https://jira.example.com";
    process.env.JIRA_API_EMAIL = "test@example.com";
    process.env.JIRA_API_TOKEN = "test-token";

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
    }).compile();
    controller = module.get<WorkflowController>(WorkflowController);
  });

  describe("getMembers", () => {
    it("should return members from workflow API", async () => {
      const mockResponse = {
        data: { code: "200", data: [{ name: "Test User" }] },
      };
      (axios.get as any).mockResolvedValue(mockResponse);

      const result = await controller.getMembers("Test");

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("uploadImageToJira", () => {
    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.uploadImageToJira("PROJ-1", undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when Jira credentials missing", async () => {
      delete process.env.JIRA_HOST_URL;
      delete process.env.JIRA_API_EMAIL;
      delete process.env.JIRA_API_TOKEN;

      // Re-create controller without credentials
      const module: TestingModule = await Test.createTestingModule({
        controllers: [WorkflowController],
      }).compile();
      const ctrl = module.get<WorkflowController>(WorkflowController);

      await expect(
        ctrl.uploadImageToJira("PROJ-1", {
          buffer: Buffer.from("img"),
          originalname: "test.png",
          mimetype: "image/png",
        } as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
