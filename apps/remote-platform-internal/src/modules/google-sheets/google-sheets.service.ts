import https from "https";

import { Injectable, Logger } from "@nestjs/common";
import { GoogleAuth } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";

type SheetsV4 = sheets_v4.Sheets;
type GridData = sheets_v4.Schema$GridData;
type CellData = sheets_v4.Schema$CellData;
type TextFormatRun = sheets_v4.Schema$TextFormatRun;

/** Represents an @ mention found in a cell */
interface MentionInfo {
  readonly userDisplayName: string;
  readonly username?: string;
  readonly email?: string;
  readonly link?: string;
  readonly type: "mention" | "text";
}

/** Detailed cell information including mentions and hyperlinks */
interface CellInfo {
  value: string;
  mentions: MentionInfo[];
  hasHyperlinks: boolean;
}

/** Simplified user data structure */
interface UserData {
  readonly username: string;
  readonly userDisplayName: string;
  readonly email: string;
}

/** Simplified cell value with optional user data */
interface SimpleCellValue {
  readonly text: string;
  userData?: UserData;
}

/** Simplified column data structure */
interface SimpleColumnData {
  readonly header: string;
  readonly values: SimpleCellValue[];
}

/** Structured sheet data returned to consumers */
export interface SimpleStructuredSheetData {
  readonly columns: SimpleColumnData[];
  readonly totalRows: number;
  readonly totalColumns: number;
  readonly spreadsheetTitle?: string;
}

/** Internal column data structure used during processing */
interface ColumnData {
  readonly header: string;
  readonly values: (string | CellInfo)[];
  readonly hasMentions: boolean;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsClient: SheetsV4 | null = null;

  /**
   * Attempt to extract an email address from a link URL.
   */
  private extractEmailFromLink(url: string): string | null {
    try {
      if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
        return null;
      }

      if (url.startsWith("mailto:")) {
        return url.replace("mailto:", "");
      }

      const emailMatch = url.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );
      return emailMatch ? emailMatch[0] : null;
    } catch (error) {
      this.logger.warn(`Failed to extract email from link: ${url}`, error);
      return null;
    }
  }

  /**
   * Create or return a cached Google Sheets API client using service account credentials.
   */
  private getOrCreateSheetsClient(): SheetsV4 {
    if (this.sheetsClient) {
      return this.sheetsClient;
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKeyEncoded =
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!serviceAccountEmail || !serviceAccountPrivateKeyEncoded) {
      throw new Error(
        "Google service account credentials are not configured. " +
          "Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.",
      );
    }

    this.logger.log(
      "Authenticating Google Sheets via service account (new client)",
    );

    // Decode Base64-encoded private key
    const serviceAccountPrivateKey = atob(serviceAccountPrivateKeyEncoded);

    const auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // For Docker environments with self-signed certificates, apply a custom HTTPS agent
    // scoped to googleapis only (not the entire Node.js process)
    const isDocker = process.env.RUNNING_IN_DOCKER === "true";
    if (isDocker) {
      const agent = new https.Agent({ rejectUnauthorized: false });
      google.options({ agent });
      this.logger.warn(
        "SSL verification disabled for Google API client only (Docker environment)",
      );
    }

    this.sheetsClient = google.sheets({ version: "v4", auth });

    this.logger.log("Google Sheets API client created and cached");
    return this.sheetsClient;
  }

  /**
   * Fetch all cell metadata for a given range in a single API call.
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
        `Fetching sheet with metadata: ${spreadsheetId}, range: ${fullRange}`,
      );
      const apiStartTime = Date.now();

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [fullRange],
        includeGridData: true,
      });

      const apiDuration = Date.now() - apiStartTime;
      this.logger.log(`Google Sheets API call duration: ${apiDuration}ms`);

      const sheet = response.data.sheets?.[0];
      const gridData = sheet?.data?.[0];

      if (!gridData) {
        this.logger.warn(`No grid data found for range: ${fullRange}`);
        return null;
      }

      return gridData;
    } catch (error) {
      this.logger.error(
        `Failed to fetch sheet with metadata (${sheetName}):`,
        error,
      );
      return null;
    }
  }

  /**
   * Retrieve spreadsheet metadata (title, sheet tab names).
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
        `Failed to fetch spreadsheet metadata (${spreadsheetId}):`,
        error,
      );
      return null;
    }
  }

  /**
   * Retrieve structured sheet data with headers, including the spreadsheet title.
   */
  public async getStructuredSheetData(
    spreadsheetId: string,
    sheetName: string,
    range?: string,
  ): Promise<SimpleStructuredSheetData | null> {
    try {
      const actualRange = range || "A:Z";

      const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
      const spreadsheetTitle = metadata?.title || "Unknown Spreadsheet";

      const gridData = await this.getSheetDataWithMetadata(
        spreadsheetId,
        sheetName,
        actualRange,
      );

      if (!gridData || !gridData.rowData || gridData.rowData.length === 0) {
        this.logger.warn(`Sheet data is empty: ${sheetName}`);
        return null;
      }

      // Extract headers from the first row
      const headerRow = gridData.rowData[0]?.values || [];
      const headers = headerRow.map(
        (cell) =>
          cell?.formattedValue || cell?.userEnteredValue?.stringValue || "",
      );
      const dataRows = gridData.rowData.slice(1);

      // Build column data structures
      const columns: ColumnData[] = [];

      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];

        // Skip columns with empty headers
        if (!header || !header.trim()) {
          continue;
        }

        // "담당자" = "Assignee" column header in Korean
        const hasMentions =
          header.includes("Assignee") || header.includes("담당자");

        const columnValues: (string | CellInfo)[] = [];

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const cellData = dataRows[rowIndex]?.values?.[colIndex];
          const cellValue =
            cellData?.formattedValue || cellData?.userEnteredValue?.stringValue;

          if (cellValue && String(cellValue).trim()) {
            if (hasMentions) {
              // For assignee columns, extract mention metadata
              const cellInfo = this.extractCellInfoFromGridData(
                cellData,
                cellValue,
              );
              columnValues.push(cellInfo);
            } else {
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

      // Convert internal data to simplified format
      const simpleColumns: SimpleColumnData[] = columns.map((column) => ({
        header: column.header,
        values: column.values.map((value) => {
          if (typeof value === "string") {
            return { text: value };
          }

          const simpleCellValue: SimpleCellValue = { text: value.value };

          if (value.mentions && value.mentions.length > 0) {
            const mention = value.mentions[0];
            if (mention.email && mention.userDisplayName) {
              simpleCellValue.userData = {
                username: mention.username || mention.email.split("@")[0],
                userDisplayName: mention.userDisplayName,
                email: mention.email,
              };
            }
          }

          return simpleCellValue;
        }),
      }));

      const result: SimpleStructuredSheetData = {
        columns: simpleColumns,
        totalRows: gridData.rowData.length - 1,
        totalColumns: simpleColumns.length,
        spreadsheetTitle,
      };

      this.logger.log(`Spreadsheet title: "${spreadsheetTitle}"`);
      this.logger.log(
        `Sheet data structured: ${result.totalRows} rows, ${result.totalColumns} columns`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve structured sheet data (${sheetName}):`,
        error,
      );
      return null;
    }
  }

  /**
   * Extract cell information and mention data from grid cell metadata.
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

    if (cellData.hyperlink) {
      cellInfo.hasHyperlinks = true;
    }

    // Extract mention info from chipRuns (modern @ mention format)
    const chipRuns = (cellData as Record<string, unknown>).chipRuns as
      | Array<{
          chip?: { personProperties?: { email?: string } };
          startIndex?: number;
        }>
      | undefined;
    if (chipRuns && chipRuns.length > 0) {
      for (const chipRun of chipRuns) {
        if (chipRun.chip?.personProperties) {
          const personProps = chipRun.chip.personProperties;
          const startIndex = chipRun.startIndex || 0;

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

    // Also check textFormatRuns for backward compatibility
    const textFormatRuns = cellData.textFormatRuns;
    if (textFormatRuns && textFormatRuns.length > 0) {
      for (const run of textFormatRuns) {
        const fmt = run.format;
        if (fmt?.link) {
          const mentionInfo: MentionInfo = {
            userDisplayName: this.extractTextFromRunData(cellValue, run),
            username: fmt.link.uri
              ? this.extractEmailFromLink(fmt.link.uri)?.split("@")[0]
              : undefined,
            link: fmt.link.uri,
            type: "mention",
          };

          if (fmt.link.uri) {
            const email = this.extractEmailFromLink(fmt.link.uri);
            if (email) {
              (mentionInfo as { email?: string }).email = email;
            }
          }

          cellInfo.mentions.push(mentionInfo);
        }
      }
    }

    return cellInfo;
  }

  /**
   * Extract a substring of text corresponding to a text format run.
   */
  private extractTextFromRunData(fullText: string, run: TextFormatRun): string {
    const startIndex = run.startIndex || 0;
    const endIndex =
      (run as Record<string, unknown>).endIndex !== undefined
        ? ((run as Record<string, unknown>).endIndex as number)
        : fullText.length;
    return fullText.substring(startIndex, endIndex);
  }
}
