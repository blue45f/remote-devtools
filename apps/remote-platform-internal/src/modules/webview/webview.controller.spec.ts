import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RecordService, ReplayCommentService } from '@remote-platform/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { S3Service } from '../s3/s3.service';

import { WebviewController } from './webview.controller';
import { WebviewGateway } from './webview.gateway';

import type { TestingModule } from '@nestjs/testing';

describe('WebviewController (Internal)', () => {
  let controller: WebviewController;
  const mockGateway = { getLiveRoomList: vi.fn() };
  const mockRecordService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findPaginated: vi.fn(),
    replaceTags: vi.fn(),
    findAllTags: vi.fn(),
    updateNote: vi.fn(),
  };
  const mockReplayCommentService = {
    findByRecordId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateBody: vi.fn(),
    setResolved: vi.fn(),
  };
  const mockS3Service = {
    listBackupFiles: vi.fn(),
    listBackupFilesLight: vi.fn(),
    getBackupDataByDeviceId: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebviewController],
      providers: [
        { provide: WebviewGateway, useValue: mockGateway },
        { provide: RecordService, useValue: mockRecordService },
        {
          provide: ReplayCommentService,
          useValue: mockReplayCommentService,
        },
        { provide: S3Service, useValue: mockS3Service },
        // AuthGuard depends on AuthService — provide a stub so the test
        // module compiles. Auth is always disabled in tests, so the guard
        // short-circuits to canActivate=true.
        {
          provide: AuthService,
          useValue: { enabled: false, verify: vi.fn() },
        },
      ],
    }).compile();
    controller = module.get<WebviewController>(WebviewController);
  });

  describe('getSessionList', () => {
    it('should return live room list', () => {
      mockGateway.getLiveRoomList.mockReturnValue([{ id: 0, name: 'Live-abc' }]);

      const result = controller.getSessionList();

      expect(result).toEqual([{ id: 0, name: 'Live-abc' }]);
    });

    it('should return empty array when no live rooms', () => {
      mockGateway.getLiveRoomList.mockReturnValue([]);
      expect(controller.getSessionList()).toEqual([]);
    });
  });

  describe('getRecordSessionList', () => {
    it('should return record sessions as a bare array when no query params are present (back-compat)', async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Session-1',
            url: 'https://example.com',
            deviceId: 'dev-1',
            duration: 5000000000,
            recordMode: true,
            timestamp: new Date('2026-01-01'),
          },
        ],
        nextCursor: null,
      });

      const result = await controller.getRecordSessionList(null);

      expect(Array.isArray(result)).toBe(true);
      expect(result as unknown as { id: number }[]).toHaveLength(1);
      expect((result as unknown as { id: number; recordMode: boolean }[])[0]).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'Session-1',
          url: 'https://example.com',
          deviceId: 'dev-1',
          recordMode: true,
          hasNote: false,
        }),
      );
    });

    it('flags rows that carry a note via hasNote', async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [
          { id: 1, name: 'with-note', recordMode: true, timestamp: new Date(), note: 'repro' },
          { id: 2, name: 'blank-note', recordMode: true, timestamp: new Date(), note: '   ' },
          { id: 3, name: 'no-note', recordMode: true, timestamp: new Date() },
        ],
        nextCursor: null,
      });

      const result = (await controller.getRecordSessionList(null)) as unknown as {
        id: number;
        hasNote: boolean;
      }[];
      expect(result.map((r) => r.hasNote)).toEqual([true, false, false]);
    });

    it('returns the paginated envelope when filters are present', async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [{ id: 7, name: 'checkout', recordMode: true, timestamp: new Date() }],
        nextCursor: '2026-04-27T00:00:00.000Z',
      });

      const result = (await controller.getRecordSessionList(null, 'checkout')) as {
        rows: unknown[];
        nextCursor: string | null;
      };

      expect(result.rows).toHaveLength(1);
      expect(result.nextCursor).toBe('2026-04-27T00:00:00.000Z');
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'checkout' }),
      );
    });

    it('rejects an invalid limit', async () => {
      await expect(
        controller.getRecordSessionList(null, undefined, undefined, undefined, undefined, 'abc'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forces orgId from auth claims, ignoring an explicit orgId param', async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [],
        nextCursor: null,
      });
      const auth = { sub: 'u1', org: 'org-trusted', plan: 'pro' } as const;
      // Caller tries to peek at another tenant via ?orgId=other
      await controller.getRecordSessionList(
        auth,
        undefined,
        undefined,
        undefined,
        'org-other',
        '10',
      );
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-trusted' }),
      );
    });

    it('falls back to the explicit orgId param when no auth claims (self-host)', async () => {
      mockRecordService.findPaginated.mockResolvedValue({
        rows: [],
        nextCursor: null,
      });
      await controller.getRecordSessionList(
        null,
        undefined,
        undefined,
        undefined,
        'org-explicit',
        '10',
      );
      expect(mockRecordService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-explicit' }),
      );
    });
  });

  describe('putRecordTags', () => {
    it('normalises, dedupes and trims tags before persisting', async () => {
      mockRecordService.replaceTags.mockResolvedValue({
        id: 42,
        tags: ['bug', 'checkout'],
      });
      const res = await controller.putRecordTags('42', {
        tags: ['  bug ', 'bug', 'checkout', '', null as unknown as string],
      });
      expect(res).toEqual({ id: 42, tags: ['bug', 'checkout'] });
      expect(mockRecordService.replaceTags).toHaveBeenCalledWith(42, ['bug', 'checkout']);
    });

    it('caps at 16 tags and 24 chars each', async () => {
      const long = 'x'.repeat(50);
      const many = Array.from({ length: 30 }, (_, i) => `t${i}`);
      mockRecordService.replaceTags.mockImplementation((_id, tags) =>
        Promise.resolve({ id: 1, tags }),
      );
      const res = await controller.putRecordTags('1', {
        tags: [long, ...many],
      });
      expect(res.tags[0]).toBe('x'.repeat(24));
      expect(res.tags.length).toBe(16);
    });

    it('rejects non-integer recordId', async () => {
      await expect(controller.putRecordTags('abc', { tags: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects non-array body.tags', async () => {
      await expect(
        controller.putRecordTags('1', { tags: 'nope' as unknown as string[] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('404s when record does not exist', async () => {
      mockRecordService.replaceTags.mockResolvedValue(null);
      await expect(controller.putRecordTags('999', { tags: ['bug'] })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('listAllRecordTags forwards orgId from auth claims', async () => {
      mockRecordService.findAllTags.mockResolvedValue(['bug', 'checkout', 'verified']);
      const out = await controller.listAllRecordTags({
        sub: 'u1',
        org: 'org-trusted',
        plan: 'pro',
      });
      expect(out).toEqual(['bug', 'checkout', 'verified']);
      expect(mockRecordService.findAllTags).toHaveBeenCalledWith('org-trusted');
    });

    it('listAllRecordTags returns the global list when not authenticated', async () => {
      mockRecordService.findAllTags.mockResolvedValue(['a', 'b']);
      const out = await controller.listAllRecordTags(null);
      expect(out).toEqual(['a', 'b']);
      expect(mockRecordService.findAllTags).toHaveBeenCalledWith(null);
    });
  });

  describe('patchRecordNote', () => {
    it('trims and persists the note', async () => {
      mockRecordService.updateNote.mockResolvedValue({ id: 7, note: 'repro: empty cart' });
      const res = await controller.patchRecordNote('7', { note: '  repro: empty cart  ' });
      expect(res).toEqual({ id: 7, note: 'repro: empty cart' });
      expect(mockRecordService.updateNote).toHaveBeenCalledWith(7, 'repro: empty cart');
    });

    it('caps the note at 4000 chars', async () => {
      const long = 'x'.repeat(5000);
      mockRecordService.updateNote.mockImplementation((_id, note) =>
        Promise.resolve({ id: 1, note }),
      );
      await controller.patchRecordNote('1', { note: long });
      expect(mockRecordService.updateNote.mock.calls[0][1]).toHaveLength(4000);
    });

    it('clears the note (null) when given an empty string', async () => {
      mockRecordService.updateNote.mockResolvedValue({ id: 1, note: null });
      const res = await controller.patchRecordNote('1', { note: '   ' });
      expect(res).toEqual({ id: 1, note: null });
      expect(mockRecordService.updateNote).toHaveBeenCalledWith(1, null);
    });

    it('rejects a non-string note', async () => {
      await expect(
        controller.patchRecordNote('1', { note: 123 as unknown as string }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-integer recordId', async () => {
      await expect(controller.patchRecordNote('abc', { note: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('404s when record does not exist', async () => {
      mockRecordService.updateNote.mockResolvedValue(null);
      await expect(controller.patchRecordNote('999', { note: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('replay comments', () => {
    it('getRecordComments returns rows sorted by service', async () => {
      mockReplayCommentService.findByRecordId.mockResolvedValue([
        {
          id: 1,
          timestampMs: 5000,
          body: 'checkout failed',
          author: 'qa',
          createdAt: new Date('2026-04-27'),
        },
      ]);
      const out = await controller.getRecordComments('42');
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
        id: 1,
        timestampMs: 5000,
        body: 'checkout failed',
        author: 'qa',
      });
      expect(mockReplayCommentService.findByRecordId).toHaveBeenCalledWith(42);
    });

    it('postRecordComment validates, trims and persists', async () => {
      mockRecordService.findOne.mockResolvedValue({ id: 42 });
      mockReplayCommentService.create.mockImplementation((data) =>
        Promise.resolve({
          id: 9,
          timestampMs: data.timestampMs,
          body: data.body,
          author: data.author ?? null,
          createdAt: new Date(),
        }),
      );

      const out = await controller.postRecordComment(null, '42', {
        timestampMs: 1234,
        body: '  the checkout button is broken  ',
        author: '  jane  ',
      });

      expect(out.id).toBe(9);
      expect(out.timestampMs).toBe(1234);
      expect(out.body).toBe('the checkout button is broken');
      expect(out.author).toBe('jane');
    });

    it('postRecordComment rejects negative timestampMs', async () => {
      await expect(
        controller.postRecordComment(null, '42', {
          timestampMs: -1,
          body: 'x',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('postRecordComment rejects blank / non-string body', async () => {
      await expect(
        controller.postRecordComment(null, '42', {
          timestampMs: 0,
          body: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.postRecordComment(null, '42', {
          timestampMs: 0,
          body: 123 as unknown as string,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('postRecordComment 404s on unknown recordId', async () => {
      mockRecordService.findOne.mockResolvedValue(null);
      await expect(
        controller.postRecordComment(null, '404', {
          timestampMs: 0,
          body: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deleteRecordComment returns 204 on success', async () => {
      mockReplayCommentService.delete.mockResolvedValue(true);
      await expect(controller.deleteRecordComment('42', '7')).resolves.toBeUndefined();
      expect(mockReplayCommentService.delete).toHaveBeenCalledWith(7, 42);
    });

    it('deleteRecordComment 404s when no row was deleted', async () => {
      mockReplayCommentService.delete.mockResolvedValue(false);
      await expect(controller.deleteRecordComment('42', '7')).rejects.toThrow(NotFoundException);
    });

    it('patchRecordComment trims body before saving', async () => {
      mockReplayCommentService.updateBody.mockResolvedValue({
        id: 7,
        timestampMs: 1234,
        body: 'updated text',
        author: 'qa',
        createdAt: new Date('2026-05-29'),
      });
      const out = await controller.patchRecordComment('42', '7', {
        body: '  updated text   ',
      });
      expect(out.body).toBe('updated text');
      expect(mockReplayCommentService.updateBody).toHaveBeenCalledWith(7, 42, 'updated text');
    });

    it('patchRecordComment rejects blank body', async () => {
      await expect(controller.patchRecordComment('42', '7', { body: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('patchRecordComment rejects non-string body', async () => {
      await expect(
        controller.patchRecordComment('42', '7', { body: 1 as unknown as string }),
      ).rejects.toThrow(BadRequestException);
    });

    it('patchRecordComment 404s when service returns null', async () => {
      mockReplayCommentService.updateBody.mockResolvedValue(null);
      await expect(controller.patchRecordComment('42', '999', { body: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('patchRecordCommentResolved sets the flag and echoes it', async () => {
      mockReplayCommentService.setResolved.mockResolvedValue({
        id: 7,
        timestampMs: 1000,
        body: 'x',
        author: null,
        createdAt: new Date(),
        resolved: true,
      });
      const out = await controller.patchRecordCommentResolved('42', '7', { resolved: true });
      expect(out.resolved).toBe(true);
      expect(mockReplayCommentService.setResolved).toHaveBeenCalledWith(7, 42, true);
    });

    it('patchRecordCommentResolved rejects a non-boolean resolved', async () => {
      await expect(
        controller.patchRecordCommentResolved('42', '7', { resolved: 'yes' as unknown as boolean }),
      ).rejects.toThrow(BadRequestException);
    });

    it('patchRecordCommentResolved 404s when service returns null', async () => {
      mockReplayCommentService.setResolved.mockResolvedValue(null);
      await expect(
        controller.patchRecordCommentResolved('42', '999', { resolved: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBackupList', () => {
    it('should return backup files', async () => {
      mockS3Service.listBackupFiles.mockResolvedValue([
        { fileName: 'session_123.json', deviceId: 'dev-1' },
      ]);

      const result = await controller.getBackupList('dev-1');

      expect(result).toHaveLength(1);
      expect(mockS3Service.listBackupFiles).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'dev-1' }),
      );
    });

    it('should throw on invalid limit param', async () => {
      await expect(
        controller.getBackupList(undefined, undefined, undefined, undefined, undefined, 'abc'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
