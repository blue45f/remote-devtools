import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RuntimeEntity } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(
    @InjectRepository(RuntimeEntity)
    private readonly runtimeRepository: Repository<RuntimeEntity>,

    private readonly recordService: RecordService,
  ) {}

  /**
   * Create a new runtime entry and associate it with the given record.
   */
  public async create(
    data: Partial<RuntimeEntity & { recordId: number }>,
  ): Promise<RuntimeEntity | undefined> {
    const { recordId, ...runtimeInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.error(`Record not found for id=${recordId}`);
      return undefined;
    }

    const runtime = this.runtimeRepository.create({
      ...runtimeInfo,
      record,
    });

    return this.runtimeRepository.save(runtime);
  }

  /**
   * Find all runtime entries for a given record, ordered by timestamp ascending.
   */
  public async findRuntimes(recordId: number): Promise<RuntimeEntity[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }
}
