export interface TicketTrendItem {
  /** Date label (format varies by period) */
  readonly date: string;
  /** Number of tickets created */
  readonly created: number;

  /** Tickets created by developers (optional) */
  readonly developer?: number;
  /** Tickets created by designers (optional) */
  readonly designer?: number;
  /** Tickets created by PMs (optional) */
  readonly pm?: number;
  /** Tickets created by QA (optional) */
  readonly qa?: number;
  /** Tickets created by other roles (optional) */
  readonly other?: number;
}

export interface TicketTrendDto {
  readonly success: boolean;
  readonly data?: TicketTrendItem[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
