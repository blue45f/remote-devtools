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
   * Creates a new runtime entry linked to the specified record.
   * Returns undefined if the record is not found.
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
   * Finds all runtime entries for a given record, ordered by timestamp.
   */
  public async findRuntimes(recordId: number): Promise<RuntimeEntity[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }
}
