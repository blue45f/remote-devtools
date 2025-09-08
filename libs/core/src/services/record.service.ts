import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RecordEntity } from "@remote-platform/entity";

/**
 * Service responsible for managing recording session lifecycle.
 * Handles CRUD operations and queries for RecordEntity entities.
 */
@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /** Create a new recording session and persist it. */
  public async create(data: Partial<RecordEntity>): Promise<RecordEntity> {
    const record = this.recordRepository.create(data);
    const saved = await this.recordRepository.save(record);
    this.logger.debug(`Record created: id=${saved.id}, name=${saved.name}`);
    return saved;
  }

  /** Find a single record by its primary key. */
  public async findOne(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({ where: { id } });
  }

  /** Retrieve all records. */
  public async findAll(): Promise<RecordEntity[]> {
    return this.recordRepository.find();
  }

  /**
   * Find all records for a given device that were created before
   * the specified record, ordered by most recent first.
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
      .createQueryBuilder("record")
      .where("record.device_id = :deviceId", { deviceId })
      .andWhere("record.timestamp < :currentTimestamp", {
        currentTimestamp: currentRecord.timestamp,
      })
      .orderBy("record.timestamp", "DESC")
      .getMany();
  }

  /** Find a record by ID with its associated network entries eagerly loaded. */
  public async findWithNetworks(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({
      where: { id },
      relations: ["networks"],
    });
  }

  /** Update the duration (in nanoseconds) of an existing record. */
  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
    this.logger.debug(
      `Record duration updated: id=${id}, duration=${duration}`,
    );
  }

  /** Delete a record by its primary key. */
  public async delete(id: number): Promise<void> {
    await this.recordRepository.delete(id);
    this.logger.debug(`Record deleted: id=${id}`);
  }
}
