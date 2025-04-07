import { CommonInfo } from "../../types/common";

/**
 * 티켓 폼 데이터 인터페이스
 */
export interface TicketFormData {
  [key: string]: string | string[]; // 동적 필드를 위해 인덱스 시그니처 사용 (components, labels는 배열)
}

/**
 * Google Sheets 구조화된 데이터 타입
 */
export interface SimpleCellValue {
  text: string;
  userData?: {
    username: string;
    userDisplayName: string;
    email: string;
  };
}

export interface SimpleColumnData {
  header: string;
  values: SimpleCellValue[];
}

export interface SimpleStructuredSheetData {
  columns: SimpleColumnData[];
  totalRows: number;
  totalColumns: number;
  spreadsheetTitle?: string; // 스프레드시트 제목 추가
}

/**
 * 템플릿 정보 타입
 */
export interface TicketTemplate {
  id: number;
  name: string;
  tcSheetLink?: string;
  jiraProjectKey?: string;
  epicTicket?: string;
  titlePrefix?: string;
  componentList?: string[];
  labelList?: string[];
}

/**
 * 사용자 템플릿 응답 타입
 */
export interface UserTemplatesResponse {
  ticketTemplateList: TicketTemplate[];
  lastSelectedTemplate?: TicketTemplate;
}

/**
 * API 응답 타입 정의
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  time?: number;
  timestamp?: string;
  syncTime?: number;
  rowCount?: number;
  columnCount?: number;
}

/**
 * 티켓 폼 데이터 API 응답 타입
 */
export interface TicketFormDataResponse {
  success: boolean;
  data?: SimpleStructuredSheetData;
  message?: string;
  errorCode?: string;
  time?: number;
}

/**
 * 커스텀 드롭다운 옵션 타입
 */
export interface DropdownOption {
  value: string;
  label: string;
  category?: string;
  disabled?: boolean;
  userData?: {
    username: string;
    userDisplayName: string;
    email: string;
  };
}

/**
 * 커스텀 드롭다운 설정 타입
 */
export interface CustomDropdownConfig {
  name: string;
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  defaultValue?: string | string[];
  options: DropdownOption[];
}

/**
 * 티켓 생성 함수 타입
 */
export type CreateTicketFunction = (
  commonInfo: CommonInfo | null,
  formData?: TicketFormData,
) => void;

/**
 * 폼 데이터 로드 파라미터 타입
 */
export interface LoadFormDataParams {
  commonInfo: CommonInfo | null;
  form: HTMLFormElement;
  loadingDiv: HTMLDivElement;
  cancelButton: HTMLButtonElement;
  submitButton: HTMLButtonElement;
  createTicketDirect: CreateTicketFunction;
}
