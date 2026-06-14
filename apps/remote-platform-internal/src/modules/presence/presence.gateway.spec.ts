import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

import type { IncomingMessage } from 'node:http';

// Minimal ws-like stub. readyState 1 === OPEN.
function makeSocket() {
  const handlers: Record<string, (arg: unknown) => void> = {};
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, cb: (arg: unknown) => void) => {
      handlers[event] = cb;
    }),
    emit: (event: string, arg?: unknown) => handlers[event]?.(arg),
  };
}

const req = (url: string) => ({ url }) as IncomingMessage;

function lastPayload(socket: ReturnType<typeof makeSocket>) {
  const calls = socket.send.mock.calls;
  return JSON.parse(calls[calls.length - 1][0] as string);
}

describe('PresenceGateway', () => {
  let gateway: PresenceGateway;

  beforeEach(() => {
    gateway = new PresenceGateway(new PresenceService());
  });

  it('closes a connection missing sessionId/clientId', () => {
    const s = makeSocket();
    gateway.handleConnection(s as never, req('/ws/presence'));
    expect(s.close).toHaveBeenCalled();
    expect(s.send).not.toHaveBeenCalled();
  });

  it('broadcasts the viewer list to all sockets in a session on join', () => {
    const a = makeSocket();
    gateway.handleConnection(a as never, req('/ws/presence?sessionId=1000&clientId=a'));
    expect(lastPayload(a)).toMatchObject({ type: 'viewers', count: 1 });

    const b = makeSocket();
    gateway.handleConnection(b as never, req('/ws/presence?sessionId=1000&clientId=b&name=Bob'));
    // Both sockets receive the updated count of 2.
    expect(lastPayload(a).count).toBe(2);
    expect(lastPayload(b).count).toBe(2);
    expect(lastPayload(b).viewers).toEqual(
      expect.arrayContaining([{ clientId: 'b', name: 'Bob' }]),
    );
  });

  it('isolates broadcasts by session', () => {
    const a = makeSocket();
    const b = makeSocket();
    gateway.handleConnection(a as never, req('/ws/presence?sessionId=1&clientId=a'));
    gateway.handleConnection(b as never, req('/ws/presence?sessionId=2&clientId=b'));
    // a only ever saw its own session (count 1), not session 2's join.
    expect(lastPayload(a).count).toBe(1);
    expect(lastPayload(b).count).toBe(1);
  });

  it('drops a viewer and rebroadcasts on disconnect', () => {
    const a = makeSocket();
    const b = makeSocket();
    gateway.handleConnection(a as never, req('/ws/presence?sessionId=1000&clientId=a'));
    gateway.handleConnection(b as never, req('/ws/presence?sessionId=1000&clientId=b'));
    expect(lastPayload(a).count).toBe(2);

    gateway.handleDisconnect(b as never);
    expect(lastPayload(a).count).toBe(1);
  });

  it('does not send to closed sockets', () => {
    const a = makeSocket();
    gateway.handleConnection(a as never, req('/ws/presence?sessionId=1000&clientId=a'));
    a.send.mockClear();
    a.readyState = 3; // CLOSED

    const b = makeSocket();
    gateway.handleConnection(b as never, req('/ws/presence?sessionId=1000&clientId=b'));
    // a was closed → no further sends to it; b still gets its own broadcast.
    expect(a.send).not.toHaveBeenCalled();
    expect(lastPayload(b).count).toBe(2);
  });
});
