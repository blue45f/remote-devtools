import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { GoogleSheetsController } from "./google-sheets.controller";
import { GoogleSheetsService } from "./google-sheets.service";

describe("GoogleSheetsController", () => {
  let controller: GoogleSheetsController;
  const mockService = {
    getSpreadsheetMetadata: vi.fn(),
    getStructuredSheetData: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleSheetsController],
      providers: [{ provide: GoogleSheetsService, useValue: mockService }],
    }).compile();
    controller = module.get<GoogleSheetsController>(GoogleSheetsController);
  });

  describe("readTcSheetFromUrl", () => {
    const validUrl =
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit";

    it("should return sheet data successfully", async () => {
      mockService.getSpreadsheetMetadata.mockResolvedValue({
        title: "Test Sheet",
        sheets: [{ properties: { title: "DebugTools" } }],
      });
      mockService.getStructuredSheetData.mockResolvedValue({
        totalRows: 10,
        totalColumns: 5,
        headers: ["A", "B", "C", "D", "E"],
        rows: [],
      });

      const result = await controller.readTcSheetFromUrl(validUrl);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.time).toBeGreaterThanOrEqual(0);
    });

    it("should use default sheet name DebugTools", async () => {
      mockService.getSpreadsheetMetadata.mockResolvedValue({ sheets: [] });
      mockService.getStructuredSheetData.mockResolvedValue({ totalRows: 0, totalColumns: 0 });

      await controller.readTcSheetFromUrl(validUrl);

      expect(mockService.getStructuredSheetData).toHaveBeenCalledWith(
        "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
        "DebugTools",
      );
    });

    it("should use custom sheet name when provided", async () => {
      mockService.getSpreadsheetMetadata.mockResolvedValue({ sheets: [] });
      mockService.getStructuredSheetData.mockResolvedValue({ totalRows: 1, totalColumns: 1 });

      await controller.readTcSheetFromUrl(validUrl, "CustomSheet");

      expect(mockService.getStructuredSheetData).toHaveBeenCalledWith(
        "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
        "CustomSheet",
      );
    });

    it("should throw BadRequestException for invalid URL", async () => {
      await expect(
        controller.readTcSheetFromUrl("https://not-google.com/sheet"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no data found", async () => {
      mockService.getSpreadsheetMetadata.mockResolvedValue({ sheets: [] });
      mockService.getStructuredSheetData.mockResolvedValue(null);

      await expect(
        controller.readTcSheetFromUrl(validUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw InternalServerErrorException for unexpected errors", async () => {
      mockService.getSpreadsheetMetadata.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(
        controller.readTcSheetFromUrl(validUrl),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
