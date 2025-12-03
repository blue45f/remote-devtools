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
    return this.recordRepository
      .createQueryBuilder("record")
      .where("record.device_id = :deviceId", { deviceId })
      .andWhere("record.id < :currentRecordId", { currentRecordId })
      .orderBy("record.id", "DESC")
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
