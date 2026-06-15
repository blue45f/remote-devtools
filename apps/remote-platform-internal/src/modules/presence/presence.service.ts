import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

export interface Viewer {
  clientId: string;
  name: string | null;
}

interface ViewerState {
  name: string | null;
  lastSeen: number;
}

/**
 * Lightweight "who's viewing this session" presence, tracked in memory with
 * a TTL. Clients heartbeat every ~10s; entries older than {@link TTL_MS} are
 * pruned on read/write so a viewer who closed the tab drops off without an
 * explicit leave. This is a polling MVP of live presence — no WebSocket
 * plumbing — so it stays single-process (good enough for one internal node;
 * a multi-node deploy would move this to Redis).
 */
@Injectable()
export class PresenceService {
  /** Viewer is considered gone if no heartbeat within this globalThis. */
  static readonly TTL_MS = 20_000;

  private readonly sessions = new Map<string, Map<string, ViewerState>>();

  /** Record a heartbeat and return the live viewer list for the session. */
  public heartbeat(sessionId: string, clientId: string, name: string | null): Viewer[] {
    let viewers = this.sessions.get(sessionId);
    if (!viewers) {
      viewers = new Map();
      this.sessions.set(sessionId, viewers);
    }
    viewers.set(clientId, { name, lastSeen: Date.now() });
    return this.collect(sessionId);
  }

  /** Current live viewers for a session (stale entries pruned). */
  public getViewers(sessionId: string): Viewer[] {
    return this.collect(sessionId);
  }

  /**
   * Explicitly drop a viewer — used by the WebSocket gateway on disconnect,
   * where a socket close is a precise "leave" (no need to wait for the TTL).
   * Returns the remaining live viewers for the session.
   */
  public remove(sessionId: string, clientId: string): Viewer[] {
    const viewers = this.sessions.get(sessionId);
    if (viewers) {
      viewers.delete(clientId);
      if (viewers.size === 0) this.sessions.delete(sessionId);
    }
    return this.collect(sessionId);
  }

  /**
   * Periodically sweep every session so an idle session whose viewers all
   * left (and is never read again) doesn't leak its map entry. `collect`
   * drops stale viewers and deletes a session once it's empty.
   */
  @Interval(60_000)
  public pruneAll(): void {
    for (const sessionId of [...this.sessions.keys()]) {
      this.collect(sessionId);
    }
  }

  private collect(sessionId: string): Viewer[] {
    const viewers = this.sessions.get(sessionId);
    if (!viewers) return [];
    const cutoff = Date.now() - PresenceService.TTL_MS;
    for (const [clientId, state] of viewers) {
      if (state.lastSeen < cutoff) viewers.delete(clientId);
    }
    if (viewers.size === 0) {
      this.sessions.delete(sessionId);
      return [];
    }
    return Array.from(viewers.entries()).map(([clientId, state]) => ({
      clientId,
      name: state.name,
    }));
  }
}
