/**
 * Extract the spreadsheet ID from a Google Sheets URL.
 * @param url Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/1od4w5nQMgsOyl6ZKL31dgn2JxcdOBVve3K6coaEt71Y/edit?gid=634974048#gid=634974048)
 * @returns The spreadsheet ID, or null if the URL is invalid
 */
export function extractGoogleSheetsId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const regex = /\/d\/([a-zA-Z0-9-_]+)\/edit/;
  const match = url.match(regex);

  return match ? match[1] : null;
}
