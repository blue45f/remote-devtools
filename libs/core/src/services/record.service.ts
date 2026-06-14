import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RecordEntity } from '@remote-platform/entity';
import { Repository } from 'typeorm';

/**
 * 녹화 세션의 생명주기를 관리하는 서비스.
 * RecordEntity에 대한 CRUD 및 조회 기능을 제공한다.
 */
@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /**
   * 새 녹화 세션을 생성하고 저장한다.
   * @param data - 녹화 엔티티의 부분 데이터
   * @returns 저장된 RecordEntity
   */
  public async create(data: Partial<RecordEntity>): Promise<RecordEntity> {
    const record = this.recordRepository.create(data);
    const saved = await this.recordRepository.save(record);
    this.logger.debug(`Record created: id=${saved.id}, name=${saved.name}`);
    return saved;
  }

  /**
   * 기본 키로 단일 녹화 레코드를 조회한다.
   * @param id - 녹화 레코드의 기본 키
   * @returns 해당 RecordEntity 또는 null
   */
  public async findOne(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({ where: { id } });
  }

  /**
   * 모든 녹화 레코드를 조회한다.
   * @returns RecordEntity 배열
   */
  public async findAll(): Promise<RecordEntity[]> {
    return this.recordRepository.find({ take: 100 });
  }

  /**
   * 검색·필터·페이지네이션 가능한 레코드 조회.
   *
   * @param opts.q          name 또는 url에 포함된 부분 문자열 (대소문자 무시)
   * @param opts.deviceId   정확 일치하는 deviceId 필터
   * @param opts.recordMode true=녹화만, false=라이브만, undefined=양쪽
   * @param opts.orgId      멀티테넌트 스코프 (NULL/undefined는 전역 범위)
   * @param opts.limit      한 페이지 크기 (기본 50, 최대 200)
   * @param opts.cursor     이전 응답의 nextCursor (timestamp ISO 문자열)
   * @returns rows + nextCursor (다음 페이지 있을 때만)
   */
  public async findPaginated(opts: {
    q?: string;
    deviceId?: string;
    recordMode?: boolean;
    orgId?: string | null;
    limit?: number;
    cursor?: string;
  }): Promise<{ rows: RecordEntity[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const qb = this.recordRepository
      .createQueryBuilder('r')
      .orderBy('r.timestamp', 'DESC')
      .limit(limit + 1); // peek one extra to know if there's another page

    if (opts.q?.trim()) {
      const term = `%${opts.q.trim().toLowerCase()}%`;
      // Search name + url plus the user-authored tags so labels a user added
      // to organise a session are findable. tags is text[]; array_to_string
      // flattens it for a single LIKE. (Notes aren't in the list payload, so
      // they stay out of search to keep client/server results consistent.)
      qb.andWhere(
        `(LOWER(r.name) LIKE :q
          OR LOWER(r.url) LIKE :q
          OR LOWER(array_to_string(r.tags, ' ')) LIKE :q)`,
        { q: term },
      );
    }
    if (opts.deviceId?.trim()) {
      qb.andWhere('r.deviceId = :did', { did: opts.deviceId.trim() });
    }
    if (typeof opts.recordMode === 'boolean') {
      qb.andWhere('r.record_mode = :rm', { rm: opts.recordMode });
    }
    if (opts.orgId) {
      qb.andWhere('r.org_id = :oid', { oid: opts.orgId });
    }
    if (opts.cursor) {
      // Cursor = ISO timestamp from the last row of the previous page.
      // Strict less-than for stable pagination.
      qb.andWhere('r.timestamp < :cur', { cur: new Date(opts.cursor) });
    }

    const peek = await qb.getMany();
    const hasMore = peek.length > limit;
    const rows = hasMore ? peek.slice(0, limit) : peek;
    const nextCursor = hasMore ? rows[rows.length - 1].timestamp.toISOString() : null;
    return { rows, nextCursor };
  }

  /**
   * 특정 디바이스에서 현재 레코드 이전에 생성된 모든 녹화 레코드를 조회한다.
   * 최신순으로 정렬하여 반환한다.
   * @param deviceId - 대상 디바이스 ID
   * @param currentRecordId - 기준이 되는 현재 레코드 ID
   * @returns 이전 RecordEntity 배열 (최신순)
   */
  public async findPreviousByDeviceId(
    deviceId: string,
    currentRecordId: number,
  ): Promise<RecordEntity[]> {
    const currentRecord = await this.recordRepository.findOne({
      where: { id: currentRecordId },
    });

    if (!currentRecord) {
      return [];
    }

    return this.recordRepository
      .createQueryBuilder('record')
      .where('record.device_id = :deviceId', { deviceId })
      .andWhere('record.timestamp < :currentTimestamp', {
        currentTimestamp: currentRecord.timestamp,
      })
      .orderBy('record.timestamp', 'DESC')
      .getMany();
  }

  /**
   * 연관된 네트워크 항목을 함께 즉시 로드하여 녹화 레코드를 조회한다.
   * @param id - 녹화 레코드의 기본 키
   * @returns 네트워크 관계가 포함된 RecordEntity 또는 null
   */
  public async findWithNetworks(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({
      where: { id },
      relations: { networks: true },
    });
  }

  /**
   * 기존 녹화 레코드의 재생 시간(나노초)을 업데이트한다.
   * @param id - 녹화 레코드의 기본 키
   * @param duration - 재생 시간 (나노초 단위)
   */
  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
    this.logger.debug(`Record duration updated: id=${id}, duration=${duration}`);
  }

  /**
   * 기본 키로 녹화 레코드를 삭제한다.
   * @param id - 삭제할 녹화 레코드의 기본 키
   */
  public async delete(id: number): Promise<void> {
    await this.recordRepository.delete(id);
    this.logger.debug(`Record deleted: id=${id}`);
  }

  /**
   * 전체 unique 태그 목록 반환. 자동완성 dropdown 용도.
   * 멀티테넌트 모드에서는 호출자가 orgId를 넘기면 해당 조직 범위로 제한된다.
   */
  public async findAllTags(orgId?: string | null): Promise<string[]> {
    const qb = this.recordRepository
      .createQueryBuilder('r')
      .select('UNNEST(r.tags)', 'tag')
      .distinct(true)
      .orderBy('tag', 'ASC');
    if (orgId) qb.where('r.org_id = :oid', { oid: orgId });
    const rows = (await qb.getRawMany()) as { tag: string }[];
    return rows.map((r) => r.tag).filter((t): t is string => typeof t === 'string' && t.length > 0);
  }

  /**
   * 세션 태그를 교체한다. 정규화(trim, lowercase 불변, 중복 제거, 빈 문자열
   * 제거)는 호출자가 책임진다 — 컨트롤러에서 한 번만 수행.
   * @param id    레코드 PK
   * @param tags  새 태그 배열
   * @returns     업데이트 후 RecordEntity 또는 null (해당 ID 없음)
   */
  public async replaceTags(id: number, tags: string[]): Promise<RecordEntity | null> {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) return null;
    record.tags = tags;
    return this.recordRepository.save(record);
  }

  /**
   * 세션 메모를 교체한다. 빈 문자열은 NULL로 정규화하여 "메모 없음"과 동일하게
   * 취급한다. trim은 호출자가 책임진다.
   * @param id    레코드 PK
   * @param note  새 메모 (null이면 메모 제거)
   * @returns     업데이트 후 RecordEntity 또는 null (해당 ID 없음)
   */
  public async updateNote(id: number, note: string | null): Promise<RecordEntity | null> {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) return null;
    record.note = note && note.length > 0 ? note : null;
    return this.recordRepository.save(record);
  }
}
