import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ImageBase64Service } from "@remote-platform/core";

import { ImageBase64Controller } from "./image-base64.controller";

describe("ImageBase64Controller (Internal)", () => {
  let controller: ImageBase64Controller;
  const mockService = { imageToBase64: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageBase64Controller],
      providers: [{ provide: ImageBase64Service, useValue: mockService }],
    }).compile();
    controller = module.get<ImageBase64Controller>(ImageBase64Controller);
  });

  it("should return base64 for image URL", async () => {
    mockService.imageToBase64.mockResolvedValue("iVBOR");
    const result = await controller.getImageBase64("https://cdn.example.com/logo.png");
    expect(result).toEqual({ base64: "iVBOR" });
  });

  it("should return empty on failure", async () => {
    mockService.imageToBase64.mockRejectedValue(new Error("timeout"));
    const result = await controller.getImageBase64("https://slow.example.com");
    expect(result).toEqual({ base64: "" });
  });
});
