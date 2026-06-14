import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RemoveRecordService } from './remove-record.service';

import type { TestingModule } from '@nestjs/testing';

describe('RemoveRecordService', () => {
  let service: RemoveRecordService;

  const mockQueryRunner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    query: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };

  const mockDataSource = {
    createQueryRunner: vi.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RemoveRecordService, { provide: DataSource, useValue: mockDataSource }],
    }).compile();

    service = module.get<RemoveRecordService>(RemoveRecordService);
  });

  describe('removeRecordOldRecords', () => {
    it('should delete old records and commit', async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: '42' }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM record'),
        expect.any(Array),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockQueryRunner.query.mockRejectedValue(new Error('DB error'));

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should pass retention days, protected id, and batch size as parameters', async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: '0' }]);

      await service.removeRecordOldRecords();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(expect.any(String), [14, 3462, 1000]);
    });

    it('should parameterize the SQL (no string interpolation of constants)', async () => {
      mockQueryRunner.query.mockResolvedValue([{ count: '0' }]);

      await service.removeRecordOldRecords();

      const [sql] = mockQueryRunner.query.mock.calls[0];
      expect(sql).toContain('$1');
      expect(sql).toContain('$2');
      expect(sql).toContain('$3');
      // Constants must not appear literally in the SQL anymore.
      expect(sql).not.toContain('3462');
      expect(sql).not.toContain('1000');
      expect(sql).not.toContain("'14 days'");
    });
  });
});
