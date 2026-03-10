import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { ImageBase64Service } from "./image-base64.service";

describe("ImageBase64Service", () => {
  let service: ImageBase64Service;
  const mockFetch = vi.fn();

  beforeEach(async () => {
    vi.stubGlobal("fetch", mockFetch);
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageBase64Service],
    }).compile();
    service = module.get<ImageBase64Service>(ImageBase64Service);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("imageToBase64", () => {
    it("should convert image URL to base64", async () => {
      const imageBytes = new Uint8Array([137, 80, 78, 71]); // PNG header bytes
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageBytes.buffer),
      });

      const result = await service.imageToBase64("https://example.com/img.png");

      expect(result).toBe(Buffer.from(imageBytes).toString("base64"));
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/img.png");
    });

    it("should return empty string on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.imageToBase64("https://example.com/missing.png");

      expect(result).toBe("");
    });

    it("should return empty string on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      const result = await service.imageToBase64("https://unreachable.com/img.png");

      expect(result).toBe("");
    });

    it("should handle empty URL gracefully", async () => {
      mockFetch.mockRejectedValue(new TypeError("Invalid URL"));

      const result = await service.imageToBase64("");

      expect(result).toBe("");
    });
  });
});
