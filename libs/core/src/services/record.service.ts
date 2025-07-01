import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Record } from "@remote-platform/entity";

@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,
  ) {}

  public async create(data: Partial<Record>): Promise<Record> {
    const record = this.recordRepository.create(data);
    const saved = await this.recordRepository.save(record);
    this.logger.debug(`[RECORD_CREATE] id=${saved.id}, name=${saved.name}`);
    return saved;
  }

  public async findOne(id: number): Promise<Record | null> {
    return this.recordRepository.findOne({ where: { id } });
  }

  public async findAll(): Promise<Record[]> {
    return this.recordRepository.find();
  }

  public async findPreviousByDeviceId(
    deviceId: string,
    currentRecordId: number,
  ): Promise<Record[]> {
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

  public async findNetworks(id: number): Promise<Record | null> {
    return this.recordRepository.findOne({
      where: { id },
      relations: ["networks"],
    });
  }

  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
    this.logger.debug(`[RECORD_UPDATE_DURATION] id=${id}, duration=${duration}`);
  }

  public async delete(id: number): Promise<void> {
    await this.recordRepository.delete(id);
    this.logger.debug(`[RECORD_DELETE] id=${id}`);
  }
}
