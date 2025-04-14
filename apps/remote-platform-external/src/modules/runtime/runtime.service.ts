import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Runtime } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class RuntimeService {
  constructor(
    @InjectRepository(Runtime)
    private runtimeRepository: Repository<Runtime>,

    private recordService: RecordService,
  ) {}

  public async create(
    data: Partial<Runtime & { recordId: number }>,
  ): Promise<Runtime> {
    const { recordId, ...runtimeInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      console.error("Record not found");
      return;
    }

    const runtime = this.runtimeRepository.create({
      ...runtimeInfo,
      record, // Record와 연관시킴
    });

    return this.runtimeRepository.save(runtime);
  }

  public async findRuntimes(recordId: number): Promise<Runtime[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }
}
