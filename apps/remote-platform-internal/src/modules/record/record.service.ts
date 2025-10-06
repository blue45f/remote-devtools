import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RecordEntity } from "@remote-platform/entity";

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /**
   * Create a new record entry.
   */
  public async create(data: Partial<RecordEntity>): Promise<RecordEntity> {
    const record = this.recordRepository.create(data);
    return this.recordRepository.save(record);
  }

  /**
   * Find a single record by its ID.
   */
  public async findOne(id: number): Promise<RecordEntity> {
    return this.recordRepository.findOne({ where: { id } });
  }

  /**
   * Find all records.
   */
  public async findAll(): Promise<RecordEntity[]> {
    return this.recordRepository.find();
  }

  /**
   * Find all previous records for a device, ordered by timestamp descending,
   * that occurred before the current record's timestamp.
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

  /**
   * Find a record by ID with its associated network entries.
   */
  public async findNetworks(id: number): Promise<RecordEntity> {
    return this.recordRepository.findOne({
      where: { id },
      relations: ["networks"],
    });
  }

  /**
   * Update the duration of a record.
   */
  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
  }
}
