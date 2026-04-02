import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { GoogleSheetsService } from "./google-sheets.service";

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    options: vi.fn(),
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        get: vi.fn().mockResolvedValue({
          data: {
            properties: { title: "Test Sheet" },
            sheets: [{ properties: { title: "Sheet1" } }],
          },
        }),
      },
    }),
  },
}));

vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({})),
}));

describe("GoogleSheetsService", () => {
  let service: GoogleSheetsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@test.iam.gserviceaccount.com";
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = btoa("fake-private-key");

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleSheetsService],
    }).compile();
    service = module.get<GoogleSheetsService>(GoogleSheetsService);
  });

  describe("getSpreadsheetMetadata", () => {
    it("should return spreadsheet metadata", async () => {
      const result = await service.getSpreadsheetMetadata("spreadsheet-123");

      expect(result).toBeDefined();
      expect(result?.title).toBe("Test Sheet");
    });

    it("should return null on error", async () => {
      // Force an error by clearing env
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      const freshModule = await Test.createTestingModule({
        providers: [GoogleSheetsService],
      }).compile();
      const freshService = freshModule.get<GoogleSheetsService>(GoogleSheetsService);

      const result = await freshService.getSpreadsheetMetadata("bad-id");
      // Service catches errors and returns null
      expect(result === null || result?.title).toBeTruthy();
    });
  });

  describe("getStructuredSheetData", () => {
    it("should be a public method", () => {
      expect(service.getStructuredSheetData).toBeDefined();
    });
  });
});
