export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_INVALID_TOKEN = "AUTH_001",
  AUTH_EXPIRED_TOKEN = "AUTH_002",
  AUTH_UNAUTHORIZED = "AUTH_003",
  AUTH_USER_NOT_FOUND = "AUTH_004",

  // Validation errors (2xxx)
  VALIDATION_FAILED = "VALIDATION_001",
  INVALID_INPUT = "VALIDATION_002",
  MISSING_REQUIRED_FIELD = "VALIDATION_003",

  // Business logic errors (3xxx)
  BUSINESS_LOGIC_ERROR = "BUSINESS_001",
  RESOURCE_NOT_FOUND = "BUSINESS_002",
  DUPLICATE_RESOURCE = "BUSINESS_003",
  OPERATION_NOT_ALLOWED = "BUSINESS_004",

  // Device/Session errors (4xxx)
  DEVICE_NOT_FOUND = "DEVICE_001",
  DEVICE_USER_NOT_FOUND = "DEVICE_002",
  SESSION_NOT_FOUND = "SESSION_001",
  SESSION_EXPIRED = "SESSION_002",

  // Template errors (45xx)
  TEMPLATE_NOT_FOUND = "TEMPLATE_001",
  TEMPLATE_CREATION_FAILED = "TEMPLATE_002",
  TEMPLATE_UPDATE_FAILED = "TEMPLATE_003",

  // JIRA errors (5xxx)
  JIRA_CONNECTION_FAILED = "JIRA_001",
  JIRA_TICKET_CREATION_FAILED = "JIRA_002",
  JIRA_INVALID_PROJECT = "JIRA_003",
  JIRA_ATTACHMENT_FAILED = "JIRA_004",

  // Slack errors (6xxx)
  SLACK_CONNECTION_FAILED = "SLACK_001",
  SLACK_MESSAGE_SEND_FAILED = "SLACK_002",
  SLACK_CHANNEL_NOT_FOUND = "SLACK_003",

  // Google Sheets errors (7xxx)
  SHEETS_CONNECTION_FAILED = "SHEETS_001",
  SHEETS_WRITE_FAILED = "SHEETS_002",
  SHEETS_READ_FAILED = "SHEETS_003",

  // System errors (9xxx)
  INTERNAL_SERVER_ERROR = "SYSTEM_001",
  DATABASE_ERROR = "SYSTEM_002",
  EXTERNAL_SERVICE_ERROR = "SYSTEM_003",
  TIMEOUT_ERROR = "SYSTEM_004",
}

export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_INVALID_TOKEN]: "Invalid token.",
  [ErrorCode.AUTH_EXPIRED_TOKEN]: "Token has expired.",
  [ErrorCode.AUTH_UNAUTHORIZED]: "Unauthorized access.",
  [ErrorCode.AUTH_USER_NOT_FOUND]: "User not found.",

  // Validation
  [ErrorCode.VALIDATION_FAILED]: "Validation failed.",
  [ErrorCode.INVALID_INPUT]: "Invalid input.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing.",

  // Business logic
  [ErrorCode.BUSINESS_LOGIC_ERROR]: "A business logic error occurred.",
  [ErrorCode.RESOURCE_NOT_FOUND]: "Requested resource not found.",
  [ErrorCode.DUPLICATE_RESOURCE]: "Resource already exists.",
  [ErrorCode.OPERATION_NOT_ALLOWED]: "Operation not allowed.",

  // Device/Session
  [ErrorCode.DEVICE_NOT_FOUND]: "Device not found.",
  [ErrorCode.DEVICE_USER_NOT_FOUND]: "Device user not found.",
  [ErrorCode.SESSION_NOT_FOUND]: "Session not found.",
  [ErrorCode.SESSION_EXPIRED]: "Session has expired.",

  // Template
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

  // System
  [ErrorCode.INTERNAL_SERVER_ERROR]: "An internal server error occurred.",
  [ErrorCode.DATABASE_ERROR]: "A database error occurred.",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    "An error occurred while connecting to an external service.",
  [ErrorCode.TIMEOUT_ERROR]: "Request timed out.",
};
