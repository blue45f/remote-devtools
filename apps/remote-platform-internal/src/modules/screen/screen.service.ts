import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ScreenEntity } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class ScreenService {
  private readonly logger = new Logger(ScreenService.name);

  constructor(
    @InjectRepository(ScreenEntity)
    private readonly screenRepository: Repository<ScreenEntity>,

    private readonly recordService: RecordService,
  ) {}

  /**
   * Insert or update a screen entry for the given record.
   */
  public async upsert(
    data: Partial<ScreenEntity & { recordId: number }>,
  ): Promise<ScreenEntity | undefined> {
    const { recordId, ...screenInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.error(`Record not found for id=${recordId}`);
      return undefined;
    }

    const screen = await this.screenRepository.upsert(
      { record: { id: recordId }, type: "screenPreview", ...screenInfo },
      { conflictPaths: { record: true, type: true } },
    );

    return this.screenRepository.save(screen.generatedMaps[0]);
  }

  /**
   * Find all screen entries for a given record (excluding screen previews),
   * ordered by timestamp ascending.
   */
  public async findScreens(recordId: number): Promise<ScreenEntity[]> {
    return this.screenRepository.find({
      where: { record: { id: recordId }, type: null },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * Find the most recent screen preview for a given record.
   */
  public async findLatestScreen(recordId: number): Promise<ScreenEntity> {
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
      order: { timestamp: "DESC" },
    });
  }
}
