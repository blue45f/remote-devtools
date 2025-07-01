export interface CreateRecordDto {
  name: string;
  deviceId?: string;
  url?: string;
  referrer?: string;
  recordMode?: boolean;
}

export interface UpdateRecordDto {
  name?: string;
  duration?: number;
  url?: string;
}

export interface RecordResponseDto {
  id: number;
  name: string;
  duration?: number;
  deviceId?: string;
  url?: string;
  referrer?: string;
  recordMode: boolean;
  timestamp: Date;
}

export interface RecordListResponseDto {
  records: RecordResponseDto[];
  total: number;
}
