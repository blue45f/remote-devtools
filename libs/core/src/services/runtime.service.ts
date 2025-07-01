import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Runtime } from "@remote-platform/entity";

import { RecordService } from "./record.service";

@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(
    @InjectRepository(Runtime)
    private runtimeRepository: Repository<Runtime>,
    private recordService: RecordService,
  ) {}

  public async create(
    data: Partial<Runtime & { recordId: number }>,
  ): Promise<Runtime | null> {
    const { recordId, ...runtimeInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `[RUNTIME_CREATE_SKIP] Record not found for id=${recordId}`,
      );
      return null;
    }

    const runtime = this.runtimeRepository.create({
      ...runtimeInfo,
      record,
    });

    const saved = await this.runtimeRepository.save(runtime);
    this.logger.debug(`[RUNTIME_CREATE] recordId=${recordId}, id=${saved.id}`);
    return saved;
  }

  public async findByRecordId(recordId: number): Promise<Runtime[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  // 별칭 메서드 (기존 코드와 호환성 유지)
  public async findRuntimes(recordId: number): Promise<Runtime[]> {
    return this.findByRecordId(recordId);
  }
}
