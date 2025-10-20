export interface RecordSessionTrendItem {
  /** Date label (format varies by period) */
  readonly date: string;
  /** Number of recording sessions created */
  readonly created: number;
  /** Total message count */
  readonly messages: number;
  /** Total participant count */
  readonly participants: number;

  /** Recording sessions created by developers (optional) */
  readonly developer?: number;
  /** Recording sessions created by designers (optional) */
  readonly designer?: number;
  /** Recording sessions created by PMs (optional) */
  readonly pm?: number;
  /** Recording sessions created by QA (optional) */
  readonly qa?: number;
  /** Recording sessions created by other roles (optional) */
  readonly other?: number;
}

export interface RecordSessionTrendDto {
  readonly success: boolean;
  readonly data?: RecordSessionTrendItem[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
