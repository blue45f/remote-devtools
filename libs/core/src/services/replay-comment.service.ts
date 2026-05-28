import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReplayCommentEntity } from '@remote-platform/entity';

/**
 * Service backing the replay-comments feature. Single-table CRUD; the
 * controller does normalisation (trim, length cap, blank check) and
 * recordId resolution before calling in.
 */
@Injectable()
export class ReplayCommentService {
  private readonly logger = new Logger(ReplayCommentService.name);

  constructor(
    @InjectRepository(ReplayCommentEntity)
    private readonly repo: Repository<ReplayCommentEntity>,
  ) {}

  public async findByRecordId(recordId: number): Promise<ReplayCommentEntity[]> {
    return this.repo.find({
      where: { record: { id: recordId } },
      order: { timestampMs: 'ASC', createdAt: 'ASC' },
    });
  }

  public async create(input: {
    recordId: number;
    timestampMs: number;
    body: string;
    author?: string | null;
    orgId?: string | null;
  }): Promise<ReplayCommentEntity> {
    const saved = await this.repo.save(
      this.repo.create({
        record: { id: input.recordId } as ReplayCommentEntity['record'],
        timestampMs: input.timestampMs,
        body: input.body,
        author: input.author ?? null,
        orgId: input.orgId ?? null,
      }),
    );
    this.logger.debug(`Replay comment created: id=${saved.id}, record=${input.recordId}`);
    return saved;
  }

  /** Returns true when a row was actually deleted. */
  public async delete(commentId: number, recordId: number): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(ReplayCommentEntity)
      .where('id = :commentId AND record_id = :recordId', {
        commentId,
        recordId,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
