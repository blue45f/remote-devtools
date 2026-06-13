import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityController } from './activity.controller';

import type { ActivityEntry, ActivityPage, ActivityService } from './activity.service';
import type { AuthClaims } from '../auth/auth.service';

describe('ActivityController', () => {
  let mockService: { getFeedPage: ReturnType<typeof vi.fn> };
  let controller: ActivityController;

  const sampleRows: ActivityEntry[] = [
    {
      id: 'session-1',
      kind: 'session',
      title: 'Live session · Alpha',
      at: '2026-05-21T10:00:00.000Z',
    },
  ];

  const samplePage: ActivityPage = {
    rows: sampleRows,
    nextCursor: '2026-05-21T09:00:00.000Z',
  };

  beforeEach(() => {
    mockService = {
      getFeedPage: vi.fn().mockResolvedValue(samplePage),
    };
    controller = new ActivityController(mockService as unknown as ActivityService);
  });

  describe('getFeed limit clamping', () => {
    it('defaults to 20 when no limit is provided', async () => {
      await controller.getFeed(null);
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, null, null, 'ko');
    });

    it('defaults to 20 when limit parses to NaN', async () => {
      await controller.getFeed(null, 'not-a-number');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, null, null, 'ko');
    });

    it('clamps a limit of 0 up to 1', async () => {
      await controller.getFeed(null, '0');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(1, null, null, 'ko');
    });

    it('clamps a negative limit up to 1', async () => {
      await controller.getFeed(null, '-5');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(1, null, null, 'ko');
    });

    it('clamps a limit of 200 down to 100', async () => {
      await controller.getFeed(null, '200');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(100, null, null, 'ko');
    });

    it('passes through a valid mid-range limit', async () => {
      await controller.getFeed(null, '42');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(42, null, null, 'ko');
    });
  });

  describe('getFeed tenant scope precedence', () => {
    it('prefers jwt.org over query.orgId', async () => {
      const claims = { sub: 'u', org: 'jwt-org' } as AuthClaims;
      await controller.getFeed(claims, '20', 'query-org');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, 'jwt-org', null, 'ko');
    });

    it('falls back to query.orgId when auth has no org claim', async () => {
      const claims = { sub: 'u' } as AuthClaims;
      await controller.getFeed(claims, '20', 'query-org');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, 'query-org', null, 'ko');
    });

    it('falls back to query.orgId when auth is null', async () => {
      await controller.getFeed(null, '20', 'query-org');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, 'query-org', null, 'ko');
    });

    it('uses null scope when neither auth.org nor orgId is provided', async () => {
      await controller.getFeed(null, '20');
      expect(mockService.getFeedPage).toHaveBeenCalledWith(20, null, null, 'ko');
    });
  });

  describe('getFeed back-compat envelope shape', () => {
    it("returns a bare array when 'before' is omitted", async () => {
      const result = await controller.getFeed(null, '20');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(sampleRows);
    });

    it("returns the paginated envelope when 'before' is provided", async () => {
      const result = await controller.getFeed(null, '20', undefined, '2026-05-21T11:00:00.000Z');
      expect(Array.isArray(result)).toBe(false);
      expect(result).toEqual(samplePage);
      expect(mockService.getFeedPage).toHaveBeenCalledWith(
        20,
        null,
        '2026-05-21T11:00:00.000Z',
        'ko',
      );
    });
  });
});
