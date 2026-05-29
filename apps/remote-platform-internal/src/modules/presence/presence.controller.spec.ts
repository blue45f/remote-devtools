import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

describe('PresenceController', () => {
  let controller: PresenceController;

  beforeEach(() => {
    controller = new PresenceController(new PresenceService());
  });

  it('records a heartbeat and returns the viewer list', () => {
    const res = controller.heartbeat('1000', { clientId: 'a', name: 'Alice' });
    expect(res.count).toBe(1);
    expect(res.viewers[0]).toEqual({ clientId: 'a', name: 'Alice' });
  });

  it('trims and caps clientId/name', () => {
    const res = controller.heartbeat('1000', {
      clientId: '  ' + 'x'.repeat(100) + '  ',
      name: 'y'.repeat(200),
    });
    expect(res.viewers[0].clientId).toHaveLength(64);
    expect(res.viewers[0].name).toHaveLength(80);
  });

  it('rejects a missing clientId', () => {
    expect(() => controller.heartbeat('1000', { clientId: '   ' })).toThrow(BadRequestException);
  });

  it('rejects a blank sessionId', () => {
    expect(() => controller.heartbeat('  ', { clientId: 'a' })).toThrow(BadRequestException);
  });

  it('getViewers reflects prior heartbeats', () => {
    controller.heartbeat('1000', { clientId: 'a', name: null });
    controller.heartbeat('1000', { clientId: 'b', name: null });
    const res = controller.getViewers('1000');
    expect(res.count).toBe(2);
  });
});
