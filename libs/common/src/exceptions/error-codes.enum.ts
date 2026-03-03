/**
 * 애플리케이션 전체에서 사용하는 표준 에러 코드 열거형.
 * 각 에러 코드는 도메인별로 그룹화되어 있다.
 */
export enum ErrorCode {
  // 인증 관련 에러 (AUTH_xxx)
  /** 유효하지 않은 토큰 */
  AUTH_INVALID_TOKEN = "AUTH_001",
  /** 만료된 토큰 */
  AUTH_EXPIRED_TOKEN = "AUTH_002",
  /** 인증되지 않은 접근 */
  AUTH_UNAUTHORIZED = "AUTH_003",
  /** 사용자를 찾을 수 없음 */
  AUTH_USER_NOT_FOUND = "AUTH_004",

  // 유효성 검증 에러 (VALIDATION_xxx)
  /** 유효성 검증 실패 */
  VALIDATION_FAILED = "VALIDATION_001",
  /** 유효하지 않은 입력값 */
  INVALID_INPUT = "VALIDATION_002",
  /** 필수 필드 누락 */
  MISSING_REQUIRED_FIELD = "VALIDATION_003",

  // 비즈니스 로직 에러 (BUSINESS_xxx)
  /** 비즈니스 로직 에러 발생 */
  BUSINESS_LOGIC_ERROR = "BUSINESS_001",
  /** 요청한 리소스를 찾을 수 없음 */
  RESOURCE_NOT_FOUND = "BUSINESS_002",
  /** 중복된 리소스 */
  DUPLICATE_RESOURCE = "BUSINESS_003",
  /** 허용되지 않은 작업 */
  OPERATION_NOT_ALLOWED = "BUSINESS_004",

  // 디바이스/세션 에러 (DEVICE_xxx, SESSION_xxx)
  /** 디바이스를 찾을 수 없음 */
  DEVICE_NOT_FOUND = "DEVICE_001",
  /** 디바이스 사용자를 찾을 수 없음 */
  DEVICE_USER_NOT_FOUND = "DEVICE_002",
  /** 세션을 찾을 수 없음 */
  SESSION_NOT_FOUND = "SESSION_001",
  /** 세션이 만료됨 */
  SESSION_EXPIRED = "SESSION_002",

  // 템플릿 에러 (TEMPLATE_xxx)
  /** 템플릿을 찾을 수 없음 */
  TEMPLATE_NOT_FOUND = "TEMPLATE_001",
  /** 템플릿 생성 실패 */
  TEMPLATE_CREATION_FAILED = "TEMPLATE_002",
  /** 템플릿 수정 실패 */
  TEMPLATE_UPDATE_FAILED = "TEMPLATE_003",

  // JIRA 연동 에러 (JIRA_xxx)
  /** JIRA 연결 실패 */
  JIRA_CONNECTION_FAILED = "JIRA_001",
  /** JIRA 티켓 생성 실패 */
  JIRA_TICKET_CREATION_FAILED = "JIRA_002",
  /** 유효하지 않은 JIRA 프로젝트 */
  JIRA_INVALID_PROJECT = "JIRA_003",
  /** JIRA 첨부파일 업로드 실패 */
  JIRA_ATTACHMENT_FAILED = "JIRA_004",

  // Slack 연동 에러 (SLACK_xxx)
  /** Slack 연결 실패 */
  SLACK_CONNECTION_FAILED = "SLACK_001",
  /** Slack 메시지 전송 실패 */
  SLACK_MESSAGE_SEND_FAILED = "SLACK_002",
  /** Slack 채널을 찾을 수 없음 */
  SLACK_CHANNEL_NOT_FOUND = "SLACK_003",

  // Google Sheets 연동 에러 (SHEETS_xxx)
  /** Google Sheets 연결 실패 */
  SHEETS_CONNECTION_FAILED = "SHEETS_001",
  /** Google Sheets 쓰기 실패 */
  SHEETS_WRITE_FAILED = "SHEETS_002",
  /** Google Sheets 읽기 실패 */
  SHEETS_READ_FAILED = "SHEETS_003",

  // S3 스토리지 에러 (S3_xxx)
  /** S3 업로드 실패 */
  S3_UPLOAD_FAILED = "S3_001",
  /** S3 다운로드 실패 */
  S3_DOWNLOAD_FAILED = "S3_002",
  /** S3 파일을 찾을 수 없음 */
  S3_FILE_NOT_FOUND = "S3_003",

  // 버퍼/녹화 에러 (BUFFER_xxx)
  /** 버퍼 플러시 실패 */
  BUFFER_FLUSH_FAILED = "BUFFER_001",
  /** 버퍼 데이터 저장 실패 */
  BUFFER_SAVE_FAILED = "BUFFER_002",

  // 시스템 에러 (SYSTEM_xxx)
  /** 내부 서버 에러 */
  INTERNAL_SERVER_ERROR = "SYSTEM_001",
  /** 데이터베이스 에러 */
  DATABASE_ERROR = "SYSTEM_002",
  /** 외부 서비스 연동 에러 */
  EXTERNAL_SERVICE_ERROR = "SYSTEM_003",
  /** 요청 타임아웃 */
  TIMEOUT_ERROR = "SYSTEM_004",
}

/**
 * 각 에러 코드에 대응하는 기본 에러 메시지 매핑 상수.
 * ErrorCode를 키로 사용하여 사람이 읽을 수 있는 메시지를 반환한다.
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // 인증
  [ErrorCode.AUTH_INVALID_TOKEN]: "Invalid token.",
  [ErrorCode.AUTH_EXPIRED_TOKEN]: "Token has expired.",
  [ErrorCode.AUTH_UNAUTHORIZED]: "Unauthorized access.",
  [ErrorCode.AUTH_USER_NOT_FOUND]: "User not found.",

  // 유효성 검증
  [ErrorCode.VALIDATION_FAILED]: "Validation failed.",
  [ErrorCode.INVALID_INPUT]: "Invalid input.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing.",

  // 비즈니스 로직
  [ErrorCode.BUSINESS_LOGIC_ERROR]: "A business logic error occurred.",
  [ErrorCode.RESOURCE_NOT_FOUND]: "Requested resource not found.",
  [ErrorCode.DUPLICATE_RESOURCE]: "Resource already exists.",
  [ErrorCode.OPERATION_NOT_ALLOWED]: "Operation not allowed.",

  // 디바이스/세션
  [ErrorCode.DEVICE_NOT_FOUND]: "Device not found.",
  [ErrorCode.DEVICE_USER_NOT_FOUND]: "Device user not found.",
  [ErrorCode.SESSION_NOT_FOUND]: "Session not found.",
  [ErrorCode.SESSION_EXPIRED]: "Session has expired.",

  // 템플릿
  [ErrorCode.TEMPLATE_NOT_FOUND]: "Template not found.",
  [ErrorCode.TEMPLATE_CREATION_FAILED]: "Failed to create template.",
  [ErrorCode.TEMPLATE_UPDATE_FAILED]: "Failed to update template.",

  // JIRA
  [ErrorCode.JIRA_CONNECTION_FAILED]: "Failed to connect to JIRA.",
  [ErrorCode.JIRA_TICKET_CREATION_FAILED]: "Failed to create JIRA ticket.",
  [ErrorCode.JIRA_INVALID_PROJECT]: "Invalid JIRA project.",
  [ErrorCode.JIRA_ATTACHMENT_FAILED]: "Failed to upload JIRA attachment.",

  // Slack
  [ErrorCode.SLACK_CONNECTION_FAILED]: "Failed to connect to Slack.",
  [ErrorCode.SLACK_MESSAGE_SEND_FAILED]: "Failed to send Slack message.",
  [ErrorCode.SLACK_CHANNEL_NOT_FOUND]: "Slack channel not found.",

  // Google Sheets
  [ErrorCode.SHEETS_CONNECTION_FAILED]: "Failed to connect to Google Sheets.",
  [ErrorCode.SHEETS_WRITE_FAILED]: "Failed to write to Google Sheets.",
  [ErrorCode.SHEETS_READ_FAILED]: "Failed to read from Google Sheets.",

  // S3
  [ErrorCode.S3_UPLOAD_FAILED]: "Failed to upload to S3.",
  [ErrorCode.S3_DOWNLOAD_FAILED]: "Failed to download from S3.",
  [ErrorCode.S3_FILE_NOT_FOUND]: "S3 file not found.",

  // 버퍼
  [ErrorCode.BUFFER_FLUSH_FAILED]: "Failed to flush buffer data.",
  [ErrorCode.BUFFER_SAVE_FAILED]: "Failed to save buffer data.",

  // 시스템
  [ErrorCode.INTERNAL_SERVER_ERROR]: "An internal server error occurred.",
  [ErrorCode.DATABASE_ERROR]: "A database error occurred.",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    "An error occurred while connecting to an external service.",
  [ErrorCode.TIMEOUT_ERROR]: "Request timed out.",
};
