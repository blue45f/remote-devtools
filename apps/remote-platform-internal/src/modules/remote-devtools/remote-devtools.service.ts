import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RecordEntity, RuntimeEntity } from '@remote-platform/entity';
import { Repository } from 'typeorm';

import type { RemoteCommandDto } from './dto/remote-command.dto';
import type {
  RemoteEvent,
  RemoteEventLevel,
  RemoteSession,
  RemoteSessionStatus,
} from './remote-devtools.types';

/** Records with a heartbeat newer than this are considered "live/running". */
const LIVE_WINDOW_MS = 2 * 60_000;

@Injectable()
export class RemoteDevToolsService {
  private readonly logger = new Logger(RemoteDevToolsService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepo: Repository<RecordEntity>,
    @InjectRepository(RuntimeEntity)
    private readonly runtimeRepo: Repository<RuntimeEntity>,
  ) {}

  /**
   * Adapts the most recent records into the RemoteDevTools session shape the
   * unified console expects. Live (record_mode = false) rows with a fresh
   * timestamp are reported as `running`; everything else as `stopped`.
   */
  public async getSessions(orgId?: string | null): Promise<RemoteSession[]> {
    const rows = await this.recordRepo.find({
      where: orgId ? { orgId } : {},
      order: { timestamp: 'DESC' },
      take: 50,
    });
    const now = Date.now();
    return rows.map((r) => this.toSession(r, now));
  }

  public async getEvents(sessionId: string, orgId?: string | null): Promise<RemoteEvent[]> {
    const recordId = Number(sessionId);
    if (!Number.isInteger(recordId)) {
      throw new NotFoundException(`Unknown session: ${sessionId}`);
    }
    const record = await this.recordRepo.findOne({
      where: orgId ? { id: recordId, orgId } : { id: recordId },
    });
    if (!record) throw new NotFoundException(`Unknown session: ${sessionId}`);

    const rows = await this.runtimeRepo.find({
      where: { record: { id: recordId } },
      order: { timestamp: 'ASC' },
      take: 250,
    });
    return rows.map((row) => this.toEvent(sessionId, row));
  }

  /**
   * Acknowledges a control command. The live gateway owns real CDP dispatch;
   * here we log the intent and return a structured ack so the console reflects
   * it. Unknown sessions surface a 404.
   */
  public async sendCommand(sessionId: string, dto: RemoteCommandDto): Promise<{ ok: true }> {
    const recordId = Number(sessionId);
    if (Number.isInteger(recordId)) {
      const count = await this.recordRepo.count({ where: { id: recordId } });
      if (count === 0) throw new NotFoundException(`Unknown session: ${sessionId}`);
    }
    this.logger.log(
      `command ${dto.command} on session ${sessionId}${dto.value ? ` value=${dto.value}` : ''}`,
    );
    return { ok: true };
  }

  /**
   * Creates a placeholder live session. Persistence of new CDP rooms is owned
   * by the SDK/gateway, so this returns an unpersisted idle session the console
   * can select while it waits for the device to connect.
   */
  public createSession(): RemoteSession {
    const id = `pending-${Date.now()}`;
    return {
      id,
      name: id,
      status: 'idle',
      participantCount: 0,
      eventsCount: 0,
      startedAt: new Date().toISOString(),
    };
  }

  private toSession(record: RecordEntity, now: number): RemoteSession {
    const ts = record.timestamp ? new Date(record.timestamp).getTime() : now;
    const fresh = now - ts < LIVE_WINDOW_MS;
    const status: RemoteSessionStatus = record.recordMode ? 'stopped' : fresh ? 'running' : 'idle';
    let environment: string | undefined;
    try {
      if (record.url) environment = new URL(record.url).hostname;
    } catch {
      environment = undefined;
    }
    return {
      id: String(record.id),
      name: record.name,
      status,
      environment,
      startedAt: record.timestamp ? new Date(record.timestamp).toISOString() : undefined,
      lastHeartbeatAt: record.timestamp ? new Date(record.timestamp).toISOString() : undefined,
      deviceId: record.deviceId,
      device: { userAgent: record.userAgent ?? undefined },
      participantCount: 0,
      tags: record.tags ?? [],
    };
  }

  private toEvent(sessionId: string, row: RuntimeEntity): RemoteEvent {
    const protocol = (row.protocol ?? {}) as Record<string, unknown>;
    const level = this.inferLevel(protocol);
    const message = this.inferMessage(protocol);
    const tsNum = Number(row.timestamp);
    const timestamp = Number.isFinite(tsNum)
      ? new Date(tsNum).toISOString()
      : new Date().toISOString();
    return {
      id: String(row.id),
      sessionId,
      type: 'runtime',
      level,
      source: 'Runtime',
      message,
      timestamp,
      payload: row.protocol,
    };
  }

  private inferLevel(protocol: Record<string, unknown>): RemoteEventLevel {
    const raw = String(
      (protocol.level as string) ?? (protocol.type as string) ?? 'info',
    ).toLowerCase();
    if (raw.includes('error') || raw.includes('exception')) return 'error';
    if (raw.includes('warn')) return 'warn';
    if (raw.includes('debug') || raw.includes('verbose')) return 'debug';
    return 'info';
  }

  private inferMessage(protocol: Record<string, unknown>): string {
    const text =
      (protocol.text as string) ??
      (protocol.message as string) ??
      (protocol.method as string) ??
      '';
    if (text) return String(text).slice(0, 500);
    try {
      return JSON.stringify(protocol).slice(0, 200);
    } catch {
      return '[unserializable runtime event]';
    }
  }
}
