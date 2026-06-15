/**
 * Builds the URL that opens Chrome DevTools (served by the internal backend)
 * with a WebSocket handshake parameter pointing back to the same host.
 *
 * Format:
 *   {API_HOST}/tabbed-debug/?{ws|wss}={encoded "host?room=X&recordMode=true&recordId=N"}
 *
 * @param room      Session room identifier (matches the SDK's `room` param)
 * @param recordId  Optional record ID; when present the URL opens replay mode
 * @param host      Override for testing; defaults to {@link API_HOST}
 */
import { API_HOST } from './api';

export function buildDevToolsLink(
  room: string,
  recordId?: number,
  host: string = API_HOST,
): string {
  const resolvedHost =
    host || (typeof window !== 'undefined' ? globalThis.location.origin : 'http://localhost:3000');
  const wsHost = resolvedHost.replace(/^https?:\/\/(.+)$/, '$1');
  const path = recordId ? '/ws/playback' : '/socket.io/';
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : '';
  const wsUrl = encodeURIComponent(`${wsHost}${path}?room=${room}${record}`);
  const protocol = resolvedHost.startsWith('https') ? 'wss' : 'ws';
  return `${resolvedHost}/tabbed-debug/?${protocol}=${wsUrl}`;
}
