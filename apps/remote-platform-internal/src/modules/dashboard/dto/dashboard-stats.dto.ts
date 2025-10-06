export interface DashboardStatsData {
  /** Total cumulative ticket count */
  readonly totalTickets: number;
  /** Number of tickets created today */
  readonly todayTickets: number;
  /** Weekly daily average of ticket creation */
  readonly weeklyAverage: number;

  /** Total cumulative recording session count */
  readonly totalRecordRooms: number;
  /** Number of recording sessions created today */
  readonly todayRecordRooms: number;
  /** Weekly daily average of recording session creation */
  readonly weeklyAverageRecordRooms: number;
}

export interface DashboardStatsDto {
  readonly success: boolean;
  readonly data?: DashboardStatsData;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
