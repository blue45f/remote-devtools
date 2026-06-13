import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loggerRemoteWarn = vi.fn();

vi.mock('../domain', () => ({
  ChromeDomain: class {
    startImmediateCapture = vi.fn();
    updateRoomInfo = vi.fn();
    resetForNewRecording = vi.fn();
    stopAllDomains = vi.fn();
    getCurrentRoom = vi.fn(() => 'Buffer-test');
    updateDeviceId = vi.fn();
    flushNetworkCacheForRecord = vi.fn();
    flushConsoleCacheForRecord = vi.fn();
    flushSessionReplayForRecord = vi.fn();
    execute = vi.fn(() => ({ id: 1 }));
    getScreenPreview = vi.fn(() => null);
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    hrefChange: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    remote: {
      error: vi.fn(),
      warn: loggerRemoteWarn,
    },
    userData: {
      info: vi.fn(),
    },
  },
}));

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((message: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    fakeSockets.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  addEventListener = vi.fn();
}

const fakeSockets: FakeWebSocket[] = [];

describe('RemoteDebugger', () => {
  beforeEach(() => {
    vi.resetModules();
    fakeSockets.length = 0;
    loggerRemoteWarn.mockClear();
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    document.querySelectorAll('script[data-test-sdk-script]').forEach((script) => script.remove());
  });

  it('uses VITE_EXTERNAL_WS when opening the External WebSocket', async () => {
    vi.stubEnv('VITE_EXTERNAL_WS', 'wss://configured.example.com/socket.io/');

    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();

    expect(fakeSockets[0]?.url).toBe('wss://configured.example.com/socket.io/');
  });

  it('falls back to the SDK script origin for the External WebSocket', async () => {
    const script = document.createElement('script');
    script.dataset.testSdkScript = 'true';
    script.src = 'https://external.example.com/sdk/index.umd.js';
    document.head.appendChild(script);

    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();

    // No trailing slash: must match the external gateway's
    // `@WebSocketGateway({ path: '/socket.io' })` (WsAdapter exact-matches the
    // pathname against normalizePath('/socket.io') = '/socket.io').
    expect(fakeSockets[0]?.url).toBe('wss://external.example.com/socket.io');
  });

  it('does not open WebSockets in forced demo mode', async () => {
    vi.stubEnv('VITE_FORCE_DEMO', 'true');

    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();

    expect(fakeSockets).toHaveLength(0);
  });

  it('ignores malformed WebSocket messages instead of throwing', async () => {
    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();
    const socket = fakeSockets[0];

    expect(socket).toBeDefined();
    expect(() => socket.onmessage?.({ data: 'not-json' } as MessageEvent<string>)).not.toThrow();
    expect(loggerRemoteWarn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid WebSocket message'),
      expect.any(Error),
    );
  });

  it('drops WebSocket messages without an event field', async () => {
    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();
    const socket = fakeSockets[0];

    expect(() =>
      socket.onmessage?.({
        data: JSON.stringify({ roomName: 'room-without-event' }),
      } as MessageEvent<string>),
    ).not.toThrow();
    expect(remoteDebugger.RoomName).toBeNull();
    expect(loggerRemoteWarn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid WebSocket message'),
      expect.objectContaining({ roomName: 'room-without-event' }),
    );
  });

  it('drops incomplete roomCreated messages without mutating session state', async () => {
    const { RemoteDebugger } = await import('./remoteDebugger');
    const remoteDebugger = new RemoteDebugger();

    remoteDebugger.initSocket();
    const socket = fakeSockets[0];

    expect(() =>
      socket.onmessage?.({
        data: JSON.stringify({ event: 'roomCreated' }),
      } as MessageEvent<string>),
    ).not.toThrow();
    expect(remoteDebugger.RecordId).toBeNull();
    expect(remoteDebugger.RoomName).toBeNull();
    expect(loggerRemoteWarn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid roomCreated message'),
      expect.objectContaining({ event: 'roomCreated' }),
    );
  });
});
