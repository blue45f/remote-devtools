import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset to a known config — `debug` so all levels emit, enabled.
    logger.setEnabled(true);
    logger.setLevel('debug');
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    // Restore default level so other tests aren't surprised
    logger.setLevel('info');
  });

  it('exposes per-category groups with debug/info/warn/error', () => {
    const groups = [
      'userData',
      'rewrite',
      'commonInfo',
      'hrefChange',
      'deepLink',
      'deepLinkAction',
      'remote',
    ] as const;
    for (const g of groups) {
      const grp = logger[g];
      expect(typeof grp.debug).toBe('function');
      expect(typeof grp.info).toBe('function');
      expect(typeof grp.warn).toBe('function');
      expect(typeof grp.error).toBe('function');
    }
  });

  it('routes info to console.log', () => {
    logger.remote.info('hello');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const firstCall = logSpy.mock.calls[0];
    if (!firstCall) throw new Error('Expected logger to call console.log');
    const [fmt] = firstCall;
    expect(String(fmt)).toContain('Remote');
    expect(String(fmt)).toContain('hello');
  });

  it('routes warn to console.warn', () => {
    logger.userData.warn('watch out');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('routes error to console.error', () => {
    logger.userData.error('boom');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('includes extra args when provided', () => {
    const obj = { foo: 1 };
    logger.rewrite.info('with args', obj);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const args = logSpy.mock.calls[0];
    if (!args) throw new Error('Expected logger to call console.log');
    // The last argument to the console call should be the extra arg
    expect(args[args.length - 1]).toBe(obj);
  });

  it('respects setEnabled(false) by suppressing output', () => {
    logger.setEnabled(false);
    logger.remote.info('nope');
    logger.remote.error('nope');
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logger.setEnabled(true);
  });

  it('filters out lower-priority levels', () => {
    logger.setLevel('warn');
    logger.remote.debug('d');
    logger.remote.info('i');
    expect(logSpy).not.toHaveBeenCalled();

    logger.remote.warn('w');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    logger.remote.error('e');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('setLevel persists to localStorage', () => {
    logger.setLevel('error');
    expect(localStorage.getItem('REMOTE_DEBUG_LOG_LEVEL')).toBe('error');
  });

  it('hides debug logs when showDebug is off', () => {
    logger.setLevel('info'); // disables showDebug
    logger.remote.debug('hidden');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('exposes a remoteDebugLogger handle on window', () => {
    const handle = globalThis.remoteDebugLogger;
    if (!handle) throw new Error('Expected remoteDebugLogger on window');
    expect(typeof handle.setLevel).toBe('function');
    expect(typeof handle.enable).toBe('function');
    expect(typeof handle.disable).toBe('function');

    handle.disable();
    logger.remote.info('after disable');
    expect(logSpy).not.toHaveBeenCalled();

    handle.enable();
    logger.remote.info('after enable');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
