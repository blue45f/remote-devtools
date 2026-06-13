import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import * as WebSocket from 'ws';

import { PresenceService } from './presence.service';

import type { IncomingMessage } from 'node:http';

interface SocketMeta {
  sessionId: string;
  clientId: string;
}

/** WebSocket.readyState OPEN is standardised as 1; reference it directly
 * rather than the class static, which isn't exposed via the namespace
 * import in every module resolution context. */
const WS_OPEN = 1;

/**
 * Raw-ws gateway that pushes live viewer presence. Mounted on a distinct
 * path so it coexists with the DevTools gateway (default path) without
 * touching it. Connect = join, close = leave (precise, no TTL wait); the
 * shared PresenceService keeps the HTTP polling endpoints consistent with
 * the WebSocket view. The client falls back to HTTP polling if this socket
 * can't connect, so DevTools is never affected by presence transport.
 */
@WebSocketGateway({ path: '/ws/presence' })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PresenceGateway.name);

  private readonly meta = new Map<WebSocket, SocketMeta>();
  private readonly sessionSockets = new Map<string, Set<WebSocket>>();

  constructor(private readonly presence: PresenceService) {}

  public handleConnection(client: WebSocket, req: IncomingMessage): void {
    const { sessionId, clientId, name } = this.parseQuery(req?.url ?? '');
    if (!sessionId || !clientId) {
      client.close();
      return;
    }

    this.meta.set(client, { sessionId, clientId });
    let sockets = this.sessionSockets.get(sessionId);
    if (!sockets) {
      sockets = new Set();
      this.sessionSockets.set(sessionId, sockets);
    }
    sockets.add(client);

    this.presence.heartbeat(sessionId, clientId, name);

    // A client `ping` refreshes the TTL so a long-open tab stays counted even
    // if the socket is otherwise idle.
    client.on('message', (raw: WebSocket.RawData) => {
      if (raw.toString() === 'ping') {
        this.presence.heartbeat(sessionId, clientId, name);
      }
    });

    this.broadcast(sessionId);
  }

  public handleDisconnect(client: WebSocket): void {
    const meta = this.meta.get(client);
    if (!meta) return;
    this.meta.delete(client);

    const sockets = this.sessionSockets.get(meta.sessionId);
    if (sockets) {
      sockets.delete(client);
      if (sockets.size === 0) this.sessionSockets.delete(meta.sessionId);
    }

    this.presence.remove(meta.sessionId, meta.clientId);
    this.broadcast(meta.sessionId);
  }

  /** Push the current viewer list to every open socket in the session. */
  private broadcast(sessionId: string): void {
    const viewers = this.presence.getViewers(sessionId);
    const payload = JSON.stringify({ type: 'viewers', count: viewers.length, viewers });
    const sockets = this.sessionSockets.get(sessionId);
    if (!sockets) return;
    for (const socket of sockets) {
      if (socket.readyState === WS_OPEN) {
        try {
          socket.send(payload);
        } catch (error) {
          this.logger.warn(`[PRESENCE] send failed: ${(error as Error).message}`);
        }
      }
    }
  }

  private parseQuery(url: string): {
    sessionId: string | null;
    clientId: string | null;
    name: string | null;
  } {
    const qs = url.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    const trimOrNull = (v: string | null, max: number): string | null => {
      const t = (v ?? '').trim().slice(0, max);
      return t || null;
    };
    return {
      sessionId: trimOrNull(params.get('sessionId'), 128),
      clientId: trimOrNull(params.get('clientId'), 64),
      name: trimOrNull(params.get('name'), 80),
    };
  }
}
