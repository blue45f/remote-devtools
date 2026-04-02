/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as WebSocket from "ws";

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
  params?: Record<string, any>;
  result?: Record<string, any>;
  error?: { code?: number; message: string };
  event?: string;
  [key: string]: any;
};

/** A single item produced when converting S3 backup data into a sendable protocol entry. */
export type ProtocolEntry = {
  protocol: { method: string; params: Record<string, any> };
  timestamp: number;
  domain: string;
  requestId?: number;
};
