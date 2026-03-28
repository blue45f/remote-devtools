import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ImageBase64Service } from "@remote-platform/core";

import { ImageBase64Controller } from "./image-base64.controller";

describe("ImageBase64Controller (External)", () => {
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

  it("should return base64 string for valid URL", async () => {
    mockService.imageToBase64.mockResolvedValue("aGVsbG8=");
    const result = await controller.getImageBase64("https://example.com/img.png");
    expect(result).toEqual({ base64: "aGVsbG8=" });
  });

  it("should return empty base64 on error", async () => {
    mockService.imageToBase64.mockRejectedValue(new Error("fail"));
    const result = await controller.getImageBase64("bad-url");
    expect(result).toEqual({ base64: "" });
  });
});
