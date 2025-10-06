import {
  Controller,
  Get,
  Logger,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { GoogleSheetsService } from "./google-sheets.service";

/** Standard API response wrapper */
interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly time?: number;
  readonly error?: string;
  readonly message?: string;
  readonly errorCode?: string;
}

@Controller("api/google-sheets")
export class GoogleSheetsController {
  private readonly logger = new Logger(GoogleSheetsController.name);

  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  /**
   * Read TC sheet data directly from a Google Sheets URL (admin use).
   */
  @Get("read-tc-sheet")
  public async readTcSheetFromUrl(
    @Query("sheetUrl") sheetUrl: string,
    @Query("sheetName") sheetName?: string,
  ): Promise<ApiResponse> {
    this.logger.log(`[ADMIN] Reading TC sheet: ${sheetUrl}`);
    const timeStart = Date.now();

    try {
      // 1. Extract spreadsheet ID from URL
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        throw new BadRequestException("Invalid Google Sheets URL.");
      }

      // 2. Set default sheet name
      const targetSheetName = sheetName || "DebugTools";

      this.logger.log(
        `[ADMIN] Spreadsheet ID: ${spreadsheetId}, sheet: ${targetSheetName}`,
      );

      // 3. Retrieve all sheet tab names for debugging
      const metadata =
        await this.googleSheetsService.getSpreadsheetMetadata(spreadsheetId);
      const availableSheets: string[] = [];
      if (metadata?.sheets) {
        for (const sheet of metadata.sheets) {
          const sheetTitle = (sheet as { properties?: { title?: string } })
            ?.properties?.title;
          if (sheetTitle) {
            availableSheets.push(sheetTitle);
          }
        }
      }
      this.logger.log(
        `Available sheet tabs: ${JSON.stringify(availableSheets)}`,
      );
      this.logger.log(`Target sheet: "${targetSheetName}"`);

      // 4. Fetch structured data via Google Sheets API
      const sheetData = await this.googleSheetsService.getStructuredSheetData(
        spreadsheetId,
        targetSheetName,
      );

      if (!sheetData) {
        throw new BadRequestException(
          `No data found in sheet '${targetSheetName}'.`,
        );
      }

      const time = Date.now() - timeStart;
      this.logger.log(
        `[ADMIN] TC sheet read succeeded (${time}ms): ${sheetData.totalRows} rows, ${sheetData.totalColumns} columns`,
      );

      return {
        success: true,
        data: sheetData,
        time,
      };
    } catch (error) {
      const time = Date.now() - timeStart;
      this.logger.error(`[ADMIN] TC sheet read failed (${time}ms):`, error);

      // Re-throw NestJS exceptions as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : "An error occurred while reading sheet data.",
      );
    }
  }

  /**
   * Extract the spreadsheet ID from a Google Sheets URL.
   */
  private extractSpreadsheetId(url: string): string | null {
    try {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error("Failed to extract spreadsheet ID:", error);
      return null;
    }
  }
}
