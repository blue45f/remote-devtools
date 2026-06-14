import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, type OnGatewayConnection } from '@nestjs/websockets';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { PresenceModule } from './presence.module';

import type { AddressInfo } from 'node:net';

// A second gateway on the DEFAULT path, standing in for the DevTools
// gateway. Its presence verifies the WsAdapter routes by path so the two
// coexist — the exact integration the unit tests can't cover.
@WebSocketGateway()
class DefaultPathGateway implements OnGatewayConnection {
  public connections = 0;
  handleConnection(): void {
    this.connections += 1;
  }
}

/**
 * Tracks the latest broadcast viewer count for a socket. The listener is
 * attached synchronously at construction so the connect-time broadcast is
 * never missed, and `waitForCount` resolves on the latest value (so it can
 * await a *transition* like a drop back to 1 after a peer leaves).
 */
class PresenceClient {
  readonly ws: WebSocket;
  private latest: number | undefined;
  private waiters: { count: number; resolve: () => void; timer: NodeJS.Timeout }[] = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; count?: number };
        if (msg.type === 'viewers' && typeof msg.count === 'number') {
          this.latest = msg.count;
          this.waiters = this.waiters.filter((w) => {
            if (w.count === msg.count) {
              clearTimeout(w.timer);
              w.resolve();
              return false;
            }
            return true;
          });
        }
      } catch {
        /* ignore */
      }
    });
  }

  opened(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });
  }

  waitForCount(count: number, timeoutMs = 4000): Promise<void> {
    if (this.latest === count) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout waiting for count=${count} (latest=${this.latest})`)),
        timeoutMs,
      );
      this.waiters.push({ count, resolve, timer });
    });
  }

  close(): void {
    this.ws.close();
  }
}

function openRaw(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('open timeout')), 4000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('PresenceGateway (live ws)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PresenceModule],
      providers: [DefaultPathGateway],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    base = `ws://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('routes /ws/presence and broadcasts viewer counts across sockets', async () => {
    const a = new PresenceClient(`${base}/ws/presence?sessionId=live&clientId=A`);
    await a.opened();
    await a.waitForCount(1);

    const b = new PresenceClient(`${base}/ws/presence?sessionId=live&clientId=B&name=Bob`);
    await b.opened();
    // Both sockets observe the count rise to 2.
    await Promise.all([a.waitForCount(2), b.waitForCount(2)]);

    // Closing B drops the live count back to 1 for A.
    const backToOne = a.waitForCount(1);
    b.close();
    await backToOne;

    a.close();
  });

  it('coexists with a default-path gateway (DevTools stand-in)', async () => {
    // Connecting on the default path must succeed (routed to the other
    // gateway), proving multi-path coexistence under one WsAdapter.
    const root = await openRaw(base);
    expect(root.readyState).toBe(WebSocket.OPEN);
    root.close();
  });
});
