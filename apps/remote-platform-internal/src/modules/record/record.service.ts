import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Record } from "@remote-platform/entity";

@Injectable()
export class RecordService {
  public async create(data: Partial<Record>): Promise<Record> {
    const record = this.recordRepository.create(data);
    return this.recordRepository.save(record);
  }

  public async findOne(id: number): Promise<Record> {
    return this.recordRepository.findOne({ where: { id } });
  }

  public async findAll(): Promise<Record[]> {
    return this.recordRepository.find();
  }

  public async findPreviousByDeviceId(
    deviceId: string,
    currentRecordId: number,
  ): Promise<Record[]> {
    // 현재 기록의 createdAt 시간을 조회
    const currentRecord = await this.recordRepository.findOne({
      where: { id: currentRecordId },
    });
    if (!currentRecord) {
      return [];
    }

    // timestamp 기준으로 이전 기록들 조회
    return this.recordRepository
      .createQueryBuilder("record")
      .where("record.device_id = :deviceId", { deviceId })
      .andWhere("record.timestamp < :currentTimestamp", {
        currentTimestamp: currentRecord.timestamp,
      })
      .orderBy("record.timestamp", "DESC") // 생성 시간 기준 내림차순
      .getMany();
  }

  public async findNetworks(id: number): Promise<Record> {
    return this.recordRepository.findOne({
      where: { id: id },
      relations: ["networks"],
    });
  }

  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
  }

  constructor(
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,
  ) {}
}
