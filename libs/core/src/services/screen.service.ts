import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ScreenEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * Service responsible for persisting and querying screen capture
 * snapshots recorded during a session.
 */
@Injectable()
export class ScreenService {
  private readonly logger = new Logger(ScreenService.name);

  constructor(
    @InjectRepository(ScreenEntity)
    private readonly screenRepository: Repository<ScreenEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * Insert or update a screen preview snapshot for the given record.
   * Conflict resolution is based on the (record, type) pair.
   */
  public async upsert(
    data: Partial<ScreenEntity & { recordId: number }>,
  ): Promise<ScreenEntity | null> {
    const { recordId, ...screenInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping screen upsert: record not found for id=${recordId}`,
      );
      return null;
    }

    const result = await this.screenRepository.upsert(
      { record: { id: recordId }, type: "screenPreview", ...screenInfo },
      { conflictPaths: { record: true, type: true } },
    );

    const saved = await this.screenRepository.save(result.generatedMaps[0]);
    this.logger.debug(`Screen upserted: recordId=${recordId}`);
    return saved;
  }

  /** Retrieve all non-preview screen entries for a record, ordered by timestamp ascending. */
  public async findByRecordId(recordId: number): Promise<ScreenEntity[]> {
    return this.screenRepository.find({
      where: { record: { id: recordId }, type: null },
      order: { timestamp: "ASC" },
    });
  }

  /** Retrieve the most recent screen preview snapshot for a record. */
  public async findLatest(recordId: number): Promise<ScreenEntity | null> {
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
      order: { timestamp: "DESC" },
    });
  }

  /** Alias for {@link findByRecordId} (retained for backward compatibility). */
  public async findScreens(recordId: number): Promise<ScreenEntity[]> {
    return this.findByRecordId(recordId);
  }

  /** Alias for {@link findLatest} (retained for backward compatibility). */
  public async findLatestScreen(
    recordId: number,
  ): Promise<ScreenEntity | null> {
    return this.findLatest(recordId);
  }
}
