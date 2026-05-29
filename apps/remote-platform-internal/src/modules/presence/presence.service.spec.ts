import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new PresenceService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks viewers per session and returns them on heartbeat', () => {
    service.heartbeat('s1', 'a', 'Alice');
    const viewers = service.heartbeat('s1', 'b', null);
    expect(viewers).toHaveLength(2);
    expect(viewers.map((v) => v.clientId).sort()).toEqual(['a', 'b']);
    expect(viewers.find((v) => v.clientId === 'a')?.name).toBe('Alice');
  });

  it('isolates viewers by session', () => {
    service.heartbeat('s1', 'a', null);
    service.heartbeat('s2', 'b', null);
    expect(service.getViewers('s1').map((v) => v.clientId)).toEqual(['a']);
    expect(service.getViewers('s2').map((v) => v.clientId)).toEqual(['b']);
  });

  it('prunes viewers whose heartbeat is older than the TTL', () => {
    service.heartbeat('s1', 'a', null);
    expect(service.getViewers('s1')).toHaveLength(1);

    vi.advanceTimersByTime(PresenceService.TTL_MS + 1);
    expect(service.getViewers('s1')).toHaveLength(0);
  });

  it('keeps a viewer alive across repeated heartbeats', () => {
    service.heartbeat('s1', 'a', null);
    vi.advanceTimersByTime(PresenceService.TTL_MS - 1000);
    service.heartbeat('s1', 'a', null); // refresh before expiry
    vi.advanceTimersByTime(1500);
    expect(service.getViewers('s1')).toHaveLength(1);
  });

  it('remove drops a viewer immediately and returns the remainder', () => {
    service.heartbeat('s1', 'a', 'Alice');
    service.heartbeat('s1', 'b', null);

    const remaining = service.remove('s1', 'a');
    expect(remaining.map((v) => v.clientId)).toEqual(['b']);
    expect(service.getViewers('s1')).toHaveLength(1);
  });

  it('remove of the last viewer empties the session', () => {
    service.heartbeat('s1', 'a', null);
    expect(service.remove('s1', 'a')).toHaveLength(0);
    expect(service.getViewers('s1')).toHaveLength(0);
  });

  it('remove is a no-op for an unknown session/client', () => {
    expect(service.remove('nope', 'x')).toEqual([]);
  });

  it('pruneAll evicts idle sessions that are never read again', () => {
    service.heartbeat('s1', 'a', null);
    service.heartbeat('s2', 'b', null);
    vi.advanceTimersByTime(PresenceService.TTL_MS + 1);

    service.pruneAll();

    // Both sessions are now empty and dropped; a fresh read returns nothing
    // without having had to touch each session id explicitly.
    expect(service.getViewers('s1')).toHaveLength(0);
    expect(service.getViewers('s2')).toHaveLength(0);
  });
});
