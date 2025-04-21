import {
  Controller,
  Get,
  Logger,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { GoogleSheetsService } from "./google-sheets.service";

// 기본 응답 타입
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  time?: number;
  error?: string;
  message?: string;
  errorCode?: string;
}

@Controller("api/google-sheets")
export class GoogleSheetsController {
  private readonly logger = new Logger(GoogleSheetsController.name);

  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  /**
   * 어드민용 TC 시트 링크로 직접 시트 정보 읽어오기
   */
  @Get("read-tc-sheet")
  public async readTcSheetFromUrl(
    @Query("sheetUrl") sheetUrl: string,
    @Query("sheetName") sheetName?: string,
  ): Promise<ApiResponse> {
    this.logger.log(`📋 [ADMIN] TC 시트 직접 읽기: ${sheetUrl}`);
    const timeStart = Date.now();

    try {
      // 1. URL에서 스프레드시트 ID 추출
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        throw new BadRequestException("유효하지 않은 구글 시트 URL입니다.");
      }

      // 2. 시트 이름 기본값 설정
      const targetSheetName = sheetName || "DebugTools";

      this.logger.log(
        `🔍 [ADMIN] 스프레드시트 ID: ${spreadsheetId}, 시트명: ${targetSheetName}`,
      );

      // 3. 먼저 시트의 모든 탭 이름을 조회해서 디버깅
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
        `📋 사용 가능한 시트 탭들: ${JSON.stringify(availableSheets)}`,
      );
      this.logger.log(`🎯 찾고 있는 시트: "${targetSheetName}"`);

      // 4. Google Sheets API로 데이터 조회
      const sheetData = await this.googleSheetsService.getStructuredSheetData(
        spreadsheetId,
        targetSheetName,
      );

      if (!sheetData) {
        throw new BadRequestException(
          `시트 '${targetSheetName}'에서 데이터를 찾을 수 없습니다.`,
        );
      }

      const time = Date.now() - timeStart;
      this.logger.log(
        `✅ [ADMIN] TC 시트 직접 읽기 성공 (${time}ms): ${sheetData.totalRows}행 ${sheetData.totalColumns}열`,
      );

      return {
        success: true,
        data: sheetData,
        time,
      };
    } catch (error) {
      const time = Date.now() - timeStart;
      this.logger.error(
        `❌ [ADMIN] TC 시트 직접 읽기 실패 (${time}ms):`,
        error,
      );

      // 이미 NestJS Exception인 경우 그대로 throw
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 그 외의 에러는 InternalServerErrorException으로 처리
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : "시트 데이터 조회 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * URL에서 스프레드시트 ID 추출
   */
  private extractSpreadsheetId(url: string): string | null {
    try {
      // URL에서 스프레드시트 ID 추출
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error("스프레드시트 ID 추출 실패:", error);
      return null;
    }
  }
}
