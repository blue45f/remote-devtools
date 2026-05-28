import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LessThan } from 'typeorm';

import { RecordEntity, ReplayCommentEntity, TicketLogEntity } from '@remote-platform/entity';

export type ActivityKind = 'session' | 'ticket' | 'error' | 'join' | 'comment';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  at: string;
  device?: string;
  sessionId?: number;
}

export interface ActivityPage {
  rows: ActivityEntry[];
  /** ISO timestamp to pass back as `before` for the next page; null → end. */
  nextCursor: string | null;
}

/**
 * Aggregates a chronological feed of recent platform events.
 *
 * Sources:
 *   - record table → "session" entries
 *   - ticket_logs table → "ticket" entries (when present)
 *
 * Designed to be cheap (LIMIT N on each source) and stateless. The frontend
 * polls this endpoint to render the dashboard's "Recent activity" panel.
 */
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepo: Repository<RecordEntity>,
    @InjectRepository(TicketLogEntity)
    private readonly ticketRepo: Repository<TicketLogEntity>,
    @InjectRepository(ReplayCommentEntity)
    private readonly commentRepo: Repository<ReplayCommentEntity>,
  ) {}

  public async getFeed(
    limit = 20,
    /** Tenant scope. NULL or undefined returns the global feed (self-host mode). */
    orgId?: string | null,
  ): Promise<ActivityEntry[]> {
    const { rows } = await this.getFeedPage(limit, orgId, null);
    return rows;
  }

  /**
   * Cursor-paginated variant. `before` is an ISO timestamp from the previous
   * page's `nextCursor`. Returns null `nextCursor` when no more rows are
   * available (best-effort — the merged sort across two sources means the
   * exact "no more" boundary is approximate; the frontend should still hide
   * the "Load more" button when an empty page is returned).
   */
  public async getFeedPage(
    limit = 20,
    orgId?: string | null,
    before?: string | null,
  ): Promise<ActivityPage> {
    const sessionsLimit = Math.ceil(limit * 0.6);
    const ticketsLimit = Math.ceil(limit * 0.4);
    const commentsLimit = Math.ceil(limit * 0.4);

    const beforeDate = before ? new Date(before) : null;
    const validBefore = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null;

    const recordWhere = {
      ...(orgId ? { orgId } : {}),
      ...(validBefore ? { timestamp: LessThan(validBefore) } : {}),
    };
    const ticketWhere = validBefore ? { createdAt: LessThan(validBefore) } : undefined;
    const commentWhere = {
      ...(orgId ? { orgId } : {}),
      ...(validBefore ? { createdAt: LessThan(validBefore) } : {}),
    };

    const [records, tickets, comments] = await Promise.all([
      this.recordRepo.find({
        ...(Object.keys(recordWhere).length ? { where: recordWhere } : {}),
        order: { timestamp: 'DESC' },
        take: sessionsLimit,
      }),
      this.ticketRepo
        .find({
          ...(ticketWhere ? { where: ticketWhere } : {}),
          order: { id: 'DESC' },
          take: ticketsLimit,
        })
        .catch(() => [] as TicketLogEntity[]),
      this.commentRepo
        .find({
          ...(Object.keys(commentWhere).length ? { where: commentWhere } : {}),
          relations: { record: true },
          order: { createdAt: 'DESC' },
          take: commentsLimit,
        })
        .catch(() => [] as ReplayCommentEntity[]),
    ]);

    const entries: ActivityEntry[] = [];

    for (const r of records) {
      entries.push({
        id: `session-${r.id}`,
        kind: 'session',
        title: r.recordMode ? `Recorded session · ${r.name}` : `Live session · ${r.name}`,
        subtitle: r.url ?? undefined,
        at: (r.timestamp instanceof Date
          ? r.timestamp
          : new Date(r.timestamp ?? Date.now())
        ).toISOString(),
        device: r.deviceId ?? undefined,
        sessionId: r.recordMode ? r.id : undefined,
      });
    }

    for (const t of tickets) {
      const row = t as unknown as {
        id: number;
        ticketUrl?: string;
        name?: string;
        createdAt?: Date;
      };
      const createdAt =
        row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString();

      entries.push({
        id: `ticket-${row.id}`,
        kind: 'ticket',
        title: row.name ? `Ticket created · ${row.name}` : 'Ticket created',
        subtitle: row.ticketUrl,
        at: createdAt,
      });
    }

    for (const c of comments) {
      const sessionName = c.record?.name ?? `Session #${c.record?.id ?? '?'}`;
      const author = c.author ?? 'anonymous';
      const truncated = c.body.length > 80 ? `${c.body.slice(0, 80)}…` : c.body;
      entries.push({
        id: `comment-${c.id}`,
        kind: 'comment',
        title: `Comment by ${author} on ${sessionName}`,
        subtitle: truncated,
        at: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
        sessionId: c.record?.id,
      });
    }

    entries.sort((a, b) => b.at.localeCompare(a.at));
    const rows = entries.slice(0, limit);
    const nextCursor =
      rows.length === limit && rows.length > 0 ? (rows[rows.length - 1]?.at ?? null) : null;
    return { rows, nextCursor };
  }
}
