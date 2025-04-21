/**
 * Google Sheets URL에서 스프레드시트 ID를 추출합니다.
 * @param url Google Sheets URL (예: https://docs.google.com/spreadsheets/d/1od4w5nQMgsOyl6ZKL31dgn2JxcdOBVve3K6coaEt71Y/edit?gid=634974048#gid=634974048)
 * @returns 스프레드시트 ID 또는 null (URL이 유효하지 않은 경우)
 */
export function extractGoogleSheetsId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  // Google Sheets URL 패턴: /d/[스프레드시트ID]/edit
  const regex = /\/d\/([a-zA-Z0-9-_]+)\/edit/;
  const match = url.match(regex);

  return match ? match[1] : null;
}
