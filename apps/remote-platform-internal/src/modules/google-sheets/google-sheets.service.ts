import { Injectable, Logger } from "@nestjs/common";
import { GoogleAuth } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";

// Google Sheets API 관련 타입 정의
type SheetsV4 = sheets_v4.Sheets;
type GridData = sheets_v4.Schema$GridData;
type CellData = sheets_v4.Schema$CellData;
type TextFormatRun = sheets_v4.Schema$TextFormatRun;

// @ 멘션 정보를 담는 인터페이스
interface MentionInfo {
  userDisplayName: string; // 한글 이름
  username?: string; // 이메일 앞의 영어 이름
  email?: string;
  link?: string;
  type: "mention" | "text";
}

// 셀 정보를 담는 인터페이스
interface CellInfo {
  value: string;
  mentions: MentionInfo[];
  hasHyperlinks: boolean;
}

// 간단한 사용자 데이터 구조
interface UserData {
  username: string;
  userDisplayName: string;
  email: string;
}

// 간단한 셀 값 구조
interface SimpleCellValue {
  text: string;
  userData?: UserData;
}

// 간단한 컬럼 데이터 구조
interface SimpleColumnData {
  header: string;
  values: SimpleCellValue[];
}

// 간단한 구조화된 시트 데이터
export interface SimpleStructuredSheetData {
  columns: SimpleColumnData[];
  totalRows: number;
  totalColumns: number;
  spreadsheetTitle?: string; // 스프레드시트 제목 추가
}

// 컬럼 데이터 구조 (내부용)
interface ColumnData {
  header: string;
  values: (string | CellInfo)[];
  hasMentions: boolean;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsClient: SheetsV4 | null = null; // Google Sheets 클라이언트 캐시

  /**
   * 링크 URL에서 이메일 주소 추출 시도
   */
  private extractEmailFromLink(url: string): string | null {
    try {
      // Google Drive 공유 링크에서 이메일 추출
      if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
        // 일반적으로 Google Drive 링크에서는 이메일을 직접 추출하기 어려움
        return null;
      }

      // mailto: 링크인 경우
      if (url.startsWith("mailto:")) {
        return url.replace("mailto:", "");
      }

      // Google+ 프로필 링크나 기타 구글 서비스 링크에서 추출
      const emailMatch = url.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );
      return emailMatch ? emailMatch[0] : null;
    } catch (error) {
      this.logger.warn(`링크에서 이메일 추출 실패: ${url}`, error);
      return null;
    }
  }

  /**
   * Google Sheets API 클라이언트 생성 또는 캐시된 클라이언트 반환 (서비스 계정 방식)
   */
  private getOrCreateSheetsClient(): SheetsV4 {
    // 이미 생성된 클라이언트가 있으면 재사용
    if (this.sheetsClient) {
      return this.sheetsClient;
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKeyEncoded =
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!serviceAccountEmail || !serviceAccountPrivateKeyEncoded) {
      throw new Error(
        "Google 서비스 계정 정보가 설정되지 않음. " +
          "GOOGLE_SERVICE_ACCOUNT_EMAIL과 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 환경변수를 설정하세요.",
      );
    }

    this.logger.log("서비스 계정 방식으로 Google Sheets 인증 시도 (새로 생성)");

    // SSL 검증 비활성화 (Docker 환경에서 self-signed certificate 문제 해결)
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

    // Base64로 인코딩된 Private Key를 디코딩
    const serviceAccountPrivateKey = atob(serviceAccountPrivateKeyEncoded);

    const auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // Google Sheets API 클라이언트 생성
    this.sheetsClient = google.sheets({ version: "v4", auth });

    this.logger.log("Google Sheets API 클라이언트 생성 완료 (캐시됨)");
    return this.sheetsClient;
  }

  /**
   * 특정 범위의 모든 셀 메타데이터를 한 번에 조회
   * @param spreadsheetId 스프레드시트 ID
   * @param sheetName 시트 탭 이름
   * @param range 조회할 범위 (예: A1:Z100)
   * @returns 셀별 메타데이터가 포함된 그리드 데이터
   */
  private async getSheetDataWithMetadata(
    spreadsheetId: string,
    sheetName: string,
    range: string,
  ): Promise<GridData | null> {
    const sheets = this.getOrCreateSheetsClient();

    try {
      const fullRange = `${sheetName}!${range}`;

      this.logger.log(
        `메타데이터와 함께 시트 조회: ${spreadsheetId}, 범위: ${fullRange}`,
      );
      const apiStartTime = Date.now();

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [fullRange],
        includeGridData: true,
      });

      const apiEndTime = Date.now();
      this.logger.log(
        `⏱️  Google Sheets API 호출 시간: ${apiEndTime - apiStartTime}ms`,
      );

      const sheet = response.data.sheets?.[0];
      const gridData = sheet?.data?.[0];

      if (!gridData) {
        this.logger.warn(`그리드 데이터를 찾을 수 없음: ${fullRange}`);
        return null;
      }

      return gridData;
    } catch (error) {
      this.logger.error(
        `메타데이터 포함 시트 조회 실패 (${sheetName}):`,
        error,
      );
      return null;
    }
  }

  /**
   * 스프레드시트 메타데이터 조회 (제목 등)
   * @param spreadsheetId 스프레드시트 ID
   * @returns 스프레드시트 메타데이터
   */
  public async getSpreadsheetMetadata(spreadsheetId: string): Promise<{
    title: string;
    sheets?: { properties?: { title?: string } }[];
  } | null> {
    try {
      const sheets = this.getOrCreateSheetsClient();

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title,sheets.properties.title",
      });

      const title = response.data.properties?.title || "Unknown Spreadsheet";
      const sheetList = response.data.sheets || [];

      return { title, sheets: sheetList };
    } catch (error) {
      this.logger.error(
        `스프레드시트 메타데이터 조회 실패 (${spreadsheetId}):`,
        error,
      );
      return null;
    }
  }

  /**
   * 시트 데이터를 헤더 기반으로 구조화하여 조회 (스프레드시트 제목 포함)
   * @param spreadsheetId 스프레드시트 ID
   * @param sheetName 시트 탭 이름
   * @param range 조회할 범위 (예: A1:Z100), 생략 시 전체 데이터 조회
   * @returns 구조화된 시트 데이터 + 스프레드시트 제목
   */
  public async getStructuredSheetData(
    spreadsheetId: string,
    sheetName: string,
    range?: string,
  ): Promise<SimpleStructuredSheetData | null> {
    try {
      // 1. 범위 설정 (기본값: A:F)
      const actualRange = range || "A:Z";

      // 2. 스프레드시트 메타데이터 조회 (제목)
      const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
      const spreadsheetTitle = metadata?.title || "Unknown Spreadsheet";

      // 3. 메타데이터와 함께 한 번에 모든 데이터 조회
      const gridData = await this.getSheetDataWithMetadata(
        spreadsheetId,
        sheetName,
        actualRange,
      );

      if (!gridData || !gridData.rowData || gridData.rowData.length === 0) {
        this.logger.warn(`시트 데이터가 비어있음: ${sheetName}`);
        return null;
      }

      // 3. 헤더 추출 (첫 번째 행)
      const headerRow = gridData.rowData[0]?.values || [];
      const headers = headerRow.map(
        (cell) =>
          cell?.formattedValue || cell?.userEnteredValue?.stringValue || "",
      );
      const dataRows = gridData.rowData.slice(1); // 헤더 제외한 데이터 행들

      // 4. 각 컬럼별로 데이터 구조화
      const columns: ColumnData[] = [];

      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];

        // header 값이 없거나 빈 문자열인 경우 해당 컬럼 무시
        if (!header || !header.trim()) {
          continue;
        }

        const hasMentions = header.includes("담당자");

        const columnValues: (string | CellInfo)[] = [];

        // 5. 각 행에서 해당 컬럼의 값 추출 (메타데이터 포함)
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const cellData = dataRows[rowIndex]?.values?.[colIndex];
          const cellValue =
            cellData?.formattedValue || cellData?.userEnteredValue?.stringValue;

          if (cellValue && String(cellValue).trim()) {
            if (hasMentions) {
              // '담당자' 컬럼인 경우 메타데이터에서 멘션 정보 추출
              const cellInfo = this.extractCellInfoFromGridData(
                cellData,
                cellValue,
              );
              columnValues.push(cellInfo);
            } else {
              // 일반 컬럼인 경우 문자열로 추가
              columnValues.push(String(cellValue));
            }
          }
        }

        columns.push({
          header,
          values: columnValues,
          hasMentions,
        });
      }

      // 5. 내부 데이터를 Simple 형태로 변환
      const simpleColumns: SimpleColumnData[] = columns.map((column) => ({
        header: column.header,
        values: column.values.map((value) => {
          if (typeof value === "string") {
            return { text: value };
          } else {
            // CellInfo 객체인 경우
            const simpleCellValue: SimpleCellValue = { text: value.value };

            // 멘션 정보가 있으면 userData 추가
            if (value.mentions && value.mentions.length > 0) {
              const mention = value.mentions[0]; // 첫 번째 멘션 사용
              if (mention.email && mention.userDisplayName) {
                simpleCellValue.userData = {
                  username: mention.username || mention.email.split("@")[0],
                  userDisplayName: mention.userDisplayName,
                  email: mention.email,
                };
              }
            }

            return simpleCellValue;
          }
        }),
      }));

      const result: SimpleStructuredSheetData = {
        columns: simpleColumns,
        totalRows: gridData.rowData.length - 1,
        totalColumns: simpleColumns.length, // 실제 처리된 컬럼 수
        spreadsheetTitle, // 스프레드시트 제목 추가
      };

      this.logger.log(`✅ 스프레드시트 제목: "${spreadsheetTitle}"`);
      this.logger.log(
        `✅ 시트 데이터 구조화 완료: ${result.totalRows}행 ${result.totalColumns}열`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `구조화된 시트 데이터 조회 실패 (${sheetName}):`,
        error,
      );
      return null;
    }
  }

  /**
   * 그리드 데이터에서 셀 정보와 멘션 정보를 추출
   * @param cellData 그리드 데이터의 개별 셀 데이터
   * @param cellValue 셀의 문자열 값
   * @returns CellInfo 객체
   */
  private extractCellInfoFromGridData(
    cellData: CellData | undefined,
    cellValue: string,
  ): CellInfo {
    const cellInfo: CellInfo = {
      value: cellValue,
      mentions: [],
      hasHyperlinks: false,
    };

    if (!cellData) {
      return cellInfo;
    }

    // 하이퍼링크 정보 확인
    if (cellData.hyperlink) {
      cellInfo.hasHyperlinks = true;
    }

    // chipRuns에서 멘션 정보 추출 (최신 @ 멘션 방식)
    const chipRuns = (cellData as any).chipRuns;
    if (chipRuns && chipRuns.length > 0) {
      for (const chipRun of chipRuns) {
        if (chipRun.chip?.personProperties) {
          const personProps = chipRun.chip.personProperties;
          const startIndex = chipRun.startIndex || 0;

          // 멘션 텍스트 추출
          const mentionText = cellValue.substring(0, startIndex);

          const mentionInfo: MentionInfo = {
            userDisplayName: mentionText || cellValue,
            username: personProps.email?.split("@")[0],
            email: personProps.email,
            type: "mention",
          };

          cellInfo.mentions.push(mentionInfo);
        }
      }
    }

    // textFormatRuns에서도 확인 (호환성을 위해)
    const textFormatRuns = cellData.textFormatRuns;
    if (textFormatRuns && textFormatRuns.length > 0) {
      for (const run of textFormatRuns) {
        const format = run.format;
        if (format?.link) {
          const mentionInfo: MentionInfo = {
            userDisplayName: this.extractTextFromRunData(cellValue, run),
            username: format.link.uri
              ? this.extractEmailFromLink(format.link.uri)?.split("@")[0]
              : undefined,
            link: format.link.uri,
            type: "mention",
          };

          if (format.link.uri) {
            const email = this.extractEmailFromLink(format.link.uri);
            if (email) {
              mentionInfo.email = email;
            }
          }

          cellInfo.mentions.push(mentionInfo);
        }
      }
    }

    return cellInfo;
  }

  /**
   * 텍스트 포맷 런에서 텍스트 추출 (그리드 데이터용)
   */
  private extractTextFromRunData(fullText: string, run: TextFormatRun): string {
    const startIndex = run.startIndex || 0;
    const endIndex =
      (run as any).endIndex !== undefined
        ? (run as any).endIndex
        : fullText.length;
    return fullText.substring(startIndex, endIndex);
  }
}
