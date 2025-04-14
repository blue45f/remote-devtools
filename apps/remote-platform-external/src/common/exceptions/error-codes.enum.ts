export enum ErrorCode {
  // 인증 관련 에러 (1000번대)
  AUTH_INVALID_TOKEN = "AUTH_001",
  AUTH_EXPIRED_TOKEN = "AUTH_002",
  AUTH_UNAUTHORIZED = "AUTH_003",
  AUTH_USER_NOT_FOUND = "AUTH_004",

  // 유효성 검증 에러 (2000번대)
  VALIDATION_FAILED = "VALIDATION_001",
  INVALID_INPUT = "VALIDATION_002",
  MISSING_REQUIRED_FIELD = "VALIDATION_003",

  // 비즈니스 로직 에러 (3000번대)
  BUSINESS_LOGIC_ERROR = "BUSINESS_001",
  RESOURCE_NOT_FOUND = "BUSINESS_002",
  DUPLICATE_RESOURCE = "BUSINESS_003",
  OPERATION_NOT_ALLOWED = "BUSINESS_004",

  // 장치/세션 관련 에러 (4000번대)
  DEVICE_NOT_FOUND = "DEVICE_001",
  DEVICE_USER_NOT_FOUND = "DEVICE_002",
  SESSION_NOT_FOUND = "SESSION_001",
  SESSION_EXPIRED = "SESSION_002",

  // 템플릿 관련 에러 (4500번대)
  TEMPLATE_NOT_FOUND = "TEMPLATE_001",
  TEMPLATE_CREATION_FAILED = "TEMPLATE_002",
  TEMPLATE_UPDATE_FAILED = "TEMPLATE_003",

  // JIRA 관련 에러 (5000번대)
  JIRA_CONNECTION_FAILED = "JIRA_001",
  JIRA_TICKET_CREATION_FAILED = "JIRA_002",
  JIRA_INVALID_PROJECT = "JIRA_003",
  JIRA_ATTACHMENT_FAILED = "JIRA_004",

  // Slack 관련 에러 (6000번대)
  SLACK_CONNECTION_FAILED = "SLACK_001",
  SLACK_MESSAGE_SEND_FAILED = "SLACK_002",
  SLACK_CHANNEL_NOT_FOUND = "SLACK_003",

  // Google Sheets 관련 에러 (7000번대)
  SHEETS_CONNECTION_FAILED = "SHEETS_001",
  SHEETS_WRITE_FAILED = "SHEETS_002",
  SHEETS_READ_FAILED = "SHEETS_003",

  // 시스템 에러 (9000번대)
  INTERNAL_SERVER_ERROR = "SYSTEM_001",
  DATABASE_ERROR = "SYSTEM_002",
  EXTERNAL_SERVICE_ERROR = "SYSTEM_003",
  TIMEOUT_ERROR = "SYSTEM_004",
}

// 에러 메시지 매핑
export const ErrorMessages: Record<ErrorCode, string> = {
  // 인증 관련
  [ErrorCode.AUTH_INVALID_TOKEN]: "유효하지 않은 토큰입니다.",
  [ErrorCode.AUTH_EXPIRED_TOKEN]: "만료된 토큰입니다.",
  [ErrorCode.AUTH_UNAUTHORIZED]: "권한이 없습니다.",
  [ErrorCode.AUTH_USER_NOT_FOUND]: "사용자 정보를 찾을 수 없습니다.",

  // 유효성 검증
  [ErrorCode.VALIDATION_FAILED]: "유효성 검증에 실패했습니다.",
  [ErrorCode.INVALID_INPUT]: "잘못된 입력값입니다.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "필수 필드가 누락되었습니다.",

  // 비즈니스 로직
  [ErrorCode.BUSINESS_LOGIC_ERROR]:
    "비즈니스 로직 처리 중 오류가 발생했습니다.",
  [ErrorCode.RESOURCE_NOT_FOUND]: "요청한 리소스를 찾을 수 없습니다.",
  [ErrorCode.DUPLICATE_RESOURCE]: "이미 존재하는 리소스입니다.",
  [ErrorCode.OPERATION_NOT_ALLOWED]: "허용되지 않은 작업입니다.",

  // 장치/세션
  [ErrorCode.DEVICE_NOT_FOUND]: "장치 정보를 찾을 수 없습니다.",
  [ErrorCode.DEVICE_USER_NOT_FOUND]: "장치의 사용자 정보를 찾을 수 없습니다.",
  [ErrorCode.SESSION_NOT_FOUND]: "세션을 찾을 수 없습니다.",
  [ErrorCode.SESSION_EXPIRED]: "세션이 만료되었습니다.",

  // 템플릿
  [ErrorCode.TEMPLATE_NOT_FOUND]: "템플릿을 찾을 수 없습니다.",
  [ErrorCode.TEMPLATE_CREATION_FAILED]: "템플릿 생성에 실패했습니다.",
  [ErrorCode.TEMPLATE_UPDATE_FAILED]: "템플릿 업데이트에 실패했습니다.",

  // JIRA
  [ErrorCode.JIRA_CONNECTION_FAILED]: "JIRA 연결에 실패했습니다.",
  [ErrorCode.JIRA_TICKET_CREATION_FAILED]: "JIRA 티켓 생성에 실패했습니다.",
  [ErrorCode.JIRA_INVALID_PROJECT]: "유효하지 않은 JIRA 프로젝트입니다.",
  [ErrorCode.JIRA_ATTACHMENT_FAILED]: "JIRA 첨부파일 업로드에 실패했습니다.",

  // Slack
  [ErrorCode.SLACK_CONNECTION_FAILED]: "Slack 연결에 실패했습니다.",
  [ErrorCode.SLACK_MESSAGE_SEND_FAILED]: "Slack 메시지 전송에 실패했습니다.",
  [ErrorCode.SLACK_CHANNEL_NOT_FOUND]: "Slack 채널을 찾을 수 없습니다.",

  // Google Sheets
  [ErrorCode.SHEETS_CONNECTION_FAILED]: "Google Sheets 연결에 실패했습니다.",
  [ErrorCode.SHEETS_WRITE_FAILED]: "Google Sheets 쓰기 작업에 실패했습니다.",
  [ErrorCode.SHEETS_READ_FAILED]: "Google Sheets 읽기 작업에 실패했습니다.",

  // 시스템
  [ErrorCode.INTERNAL_SERVER_ERROR]: "내부 서버 오류가 발생했습니다.",
  [ErrorCode.DATABASE_ERROR]: "데이터베이스 오류가 발생했습니다.",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    "외부 서비스 연동 중 오류가 발생했습니다.",
  [ErrorCode.TIMEOUT_ERROR]: "요청 처리 시간이 초과되었습니다.",
};
