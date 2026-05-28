import type * as WebSocket from 'ws';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoomData = {
  client: WebSocket;
  devtools: Map<string, WebSocket>;
  recordMode: boolean;
  recordId: number | null;
};

export type DevtoolsData = {
  room: string;
  devtoolsId: string;
};

/** Represents a CDP-style protocol message forwarded over WebSocket. */
export type ProtocolMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code?: number; message: string };
  event?: string;
  [key: string]: unknown;
};

/** A single item produced when converting S3 backup data into a sendable protocol entry. */
export type ProtocolEntry = {
  protocol: { method: string; params: Record<string, unknown> };
  timestamp: number;
  domain: string;
  requestId?: number;
};
