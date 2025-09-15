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

  public async create(data: Partial<RecordEntity>): Promise<RecordEntity> {
    const record = this.recordRepository.create(data);
    return this.recordRepository.save(record);
  }

  public async findOne(id: number): Promise<RecordEntity> {
    return this.recordRepository.findOne({ where: { id } });
  }

  public async findAll(): Promise<RecordEntity[]> {
    return this.recordRepository.find();
  }

  /**
   * Finds all previous records for the given device, ordered by most recent first.
   */
  public async findPreviousByDeviceId(
    deviceId: string,
    currentRecordId: number,
  ): Promise<RecordEntity[]> {
    return this.recordRepository
      .createQueryBuilder("record")
      .where("record.device_id = :deviceId", { deviceId })
      .andWhere("record.id < :currentRecordId", { currentRecordId })
      .orderBy("record.id", "DESC")
      .getMany();
  }

  /**
   * Finds a single record with its associated network entries.
   */
  public async findNetworks(id: number): Promise<RecordEntity> {
    return this.recordRepository.findOne({
      where: { id },
      relations: ["networks"],
    });
  }

  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
  }
}
