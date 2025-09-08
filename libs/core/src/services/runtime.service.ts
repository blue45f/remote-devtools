import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RuntimeEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * Service responsible for persisting and querying runtime console
 * messages captured during a recording session.
 */
@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(
    @InjectRepository(RuntimeEntity)
    private readonly runtimeRepository: Repository<RuntimeEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * Create a new runtime entry linked to an existing record.
   * Returns null when the parent record cannot be found.
   */
  public async create(
    data: Partial<RuntimeEntity & { recordId: number }>,
  ): Promise<RuntimeEntity | null> {
    const { recordId, ...runtimeInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping runtime creation: record not found for id=${recordId}`,
      );
      return null;
    }

    const runtime = this.runtimeRepository.create({
      ...runtimeInfo,
      record,
    });

    const saved = await this.runtimeRepository.save(runtime);
    this.logger.debug(
      `Runtime entry created: recordId=${recordId}, id=${saved.id}`,
    );
    return saved;
  }

  /** Retrieve all runtime entries for a record, ordered by timestamp ascending. */
  public async findByRecordId(recordId: number): Promise<RuntimeEntity[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /** Alias for {@link findByRecordId} (retained for backward compatibility). */
  public async findRuntimes(recordId: number): Promise<RuntimeEntity[]> {
    return this.findByRecordId(recordId);
  }
}
