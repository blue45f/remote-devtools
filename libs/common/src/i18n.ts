/**
 * Backend i18n helpers.
 *
 * The platform defaults to Korean. Responses are localized from the request's
 * `Accept-Language` header (the client sends it, mirroring its own i18n
 * default). Anything other than an explicit `en` resolves to Korean.
 *
 * Scope: user-facing runtime strings that reach a client or SDK consumer —
 * error-response messages and the activity feed titles. Swagger/API docs stay
 * English (developer-facing).
 */
import { ErrorCode, ErrorMessages } from './exceptions/error-codes.enum';

export type Lang = 'ko' | 'en';

/** The platform default language. */
export const DEFAULT_LANG: Lang = 'ko';

/**
 * Parse an `Accept-Language` header value into a supported language.
 * Defaults to Korean; only an explicit English preference yields `en`.
 */
export function resolveLang(acceptLanguage?: string | null): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  const primary = acceptLanguage.toLowerCase().split(',')[0]?.trim() ?? '';
  if (primary.startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

/** Korean messages for every {@link ErrorCode}. English lives in `ErrorMessages`. */
export const ErrorMessagesKo: Record<ErrorCode, string> = {
  // 인증
  [ErrorCode.AUTH_INVALID_TOKEN]: '유효하지 않은 토큰입니다.',
  [ErrorCode.AUTH_EXPIRED_TOKEN]: '토큰이 만료되었습니다.',
  [ErrorCode.AUTH_UNAUTHORIZED]: '인증되지 않은 접근입니다.',
  [ErrorCode.AUTH_USER_NOT_FOUND]: '사용자를 찾을 수 없습니다.',

  // 유효성 검증
  [ErrorCode.VALIDATION_FAILED]: '유효성 검증에 실패했습니다.',
  [ErrorCode.INVALID_INPUT]: '유효하지 않은 입력값입니다.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '필수 입력값이 누락되었습니다.',

  // 비즈니스 로직
  [ErrorCode.BUSINESS_LOGIC_ERROR]: '비즈니스 로직 오류가 발생했습니다.',
  [ErrorCode.RESOURCE_NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCode.DUPLICATE_RESOURCE]: '이미 존재하는 리소스입니다.',
  [ErrorCode.OPERATION_NOT_ALLOWED]: '허용되지 않은 작업입니다.',

  // 디바이스/세션
  [ErrorCode.DEVICE_NOT_FOUND]: '기기를 찾을 수 없습니다.',
  [ErrorCode.DEVICE_USER_NOT_FOUND]: '기기 사용자를 찾을 수 없습니다.',
  [ErrorCode.SESSION_NOT_FOUND]: '세션을 찾을 수 없습니다.',
  [ErrorCode.SESSION_EXPIRED]: '세션이 만료되었습니다.',

  // 템플릿
  [ErrorCode.TEMPLATE_NOT_FOUND]: '템플릿을 찾을 수 없습니다.',
  [ErrorCode.TEMPLATE_CREATION_FAILED]: '템플릿 생성에 실패했습니다.',
  [ErrorCode.TEMPLATE_UPDATE_FAILED]: '템플릿 수정에 실패했습니다.',

  // JIRA
  [ErrorCode.JIRA_CONNECTION_FAILED]: 'JIRA 연결에 실패했습니다.',
  [ErrorCode.JIRA_TICKET_CREATION_FAILED]: 'JIRA 티켓 생성에 실패했습니다.',
  [ErrorCode.JIRA_INVALID_PROJECT]: '유효하지 않은 JIRA 프로젝트입니다.',
  [ErrorCode.JIRA_ATTACHMENT_FAILED]: 'JIRA 첨부파일 업로드에 실패했습니다.',

  // Slack
  [ErrorCode.SLACK_CONNECTION_FAILED]: 'Slack 연결에 실패했습니다.',
  [ErrorCode.SLACK_MESSAGE_SEND_FAILED]: 'Slack 메시지 전송에 실패했습니다.',
  [ErrorCode.SLACK_CHANNEL_NOT_FOUND]: 'Slack 채널을 찾을 수 없습니다.',

  // Google Sheets
  [ErrorCode.SHEETS_CONNECTION_FAILED]: 'Google Sheets 연결에 실패했습니다.',
  [ErrorCode.SHEETS_WRITE_FAILED]: 'Google Sheets 쓰기에 실패했습니다.',
  [ErrorCode.SHEETS_READ_FAILED]: 'Google Sheets 읽기에 실패했습니다.',

  // S3
  [ErrorCode.S3_UPLOAD_FAILED]: 'S3 업로드에 실패했습니다.',
  [ErrorCode.S3_DOWNLOAD_FAILED]: 'S3 다운로드에 실패했습니다.',
  [ErrorCode.S3_FILE_NOT_FOUND]: 'S3 파일을 찾을 수 없습니다.',

  // 버퍼
  [ErrorCode.BUFFER_FLUSH_FAILED]: '버퍼 데이터 플러시에 실패했습니다.',
  [ErrorCode.BUFFER_SAVE_FAILED]: '버퍼 데이터 저장에 실패했습니다.',

  // 시스템
  [ErrorCode.INTERNAL_SERVER_ERROR]: '내부 서버 오류가 발생했습니다.',
  [ErrorCode.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '외부 서비스 연동 중 오류가 발생했습니다.',
  [ErrorCode.TIMEOUT_ERROR]: '요청 시간이 초과되었습니다.',
};

/** Resolve the localized message for an error code in the given language. */
export function getErrorMessage(code: ErrorCode, lang: Lang = DEFAULT_LANG): string {
  const table = lang === 'en' ? ErrorMessages : ErrorMessagesKo;
  return table[code] ?? ErrorMessagesKo[code] ?? ErrorMessages[code];
}

/** Generic fallback messages used when no error code maps cleanly. */
export const GenericMessages: Record<Lang, Record<'unknown' | 'request' | 'internal', string>> = {
  en: {
    unknown: 'An unknown error occurred.',
    request: 'An error occurred while processing the request.',
    internal: 'An internal server error occurred.',
  },
  ko: {
    unknown: '알 수 없는 오류가 발생했습니다.',
    request: '요청을 처리하는 중 오류가 발생했습니다.',
    internal: '내부 서버 오류가 발생했습니다.',
  },
};
