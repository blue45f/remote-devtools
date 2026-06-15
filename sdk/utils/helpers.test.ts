import { afterEach, describe, expect, it, vi } from 'vitest';

import { convertLink, getCommonInfo } from './helpers';

describe('convertLink', () => {
  // When tests run without VITE_INTERNAL_HOST set, the function uses the
  // fallback "http://localhost:3000". We rely on that here, which exercises
  // the easy path described in the task notes.

  it('builds a tabbed-debug URL with the ws protocol for http hosts', () => {
    const url = convertLink('my-room', null);

    expect(url.startsWith('http://localhost:3000/tabbed-debug/?ws=')).toBe(true);

    // The query parameter "ws" is URI-encoded; decode and inspect.
    const query = new URL(url).searchParams.get('ws');
    expect(query).not.toBeNull();
    // No recordId -> live viewer path (/socket.io/).
    expect(query).toBe('localhost:3000/socket.io/?room=my-room');
  });

  it('includes the recordMode + recordId fragment when given a recordId', () => {
    const url = convertLink('room42', 7);
    const query = new URL(url).searchParams.get('ws');
    // A recorded session replays from the internal /ws/playback gateway.
    expect(query).toBe('localhost:3000/ws/playback?room=room42&recordMode=true&recordId=7');
  });

  it('URL-encodes special characters in the room name', () => {
    const url = convertLink('a&b=c', null);
    // The room name lives inside the doubly-encoded `ws` query param;
    // the outer searchParams.get already decodes one layer.
    const query = new URL(url).searchParams.get('ws');
    expect(query).toBe('localhost:3000/socket.io/?room=a&b=c');
  });

  it("treats a falsy recordId (0) as 'no record'", () => {
    const url = convertLink('r', 0);
    const query = new URL(url).searchParams.get('ws');
    expect(query).toBe('localhost:3000/socket.io/?room=r');
    expect(query?.includes('recordMode')).toBe(false);
  });
});

describe('getCommonInfo', () => {
  afterEach(() => {
    delete globalThis.JavaScriptInterface;
  });

  it('is a no-op when JavaScriptInterface is not on window', () => {
    expect(getCommonInfo()).toBeUndefined();
  });

  it('invokes JavaScriptInterface.getCommonInfo with the expected key', () => {
    const spy = vi.fn();
    globalThis.JavaScriptInterface = { getCommonInfo: spy };

    getCommonInfo();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('REMOTE_DEBUG_SDK_COMMON_INFO');
  });
});
