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
import { API_HOST } from "./api";

export function buildDevToolsLink(
  room: string,
  recordId?: number,
  host: string = API_HOST,
): string {
  const wsHost = host.replace(/^https?:\/\/(.+)$/, "$1");
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
}
