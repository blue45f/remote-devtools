import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Screen } from "@remote-platform/entity";

import { RecordService } from "./record.service";

@Injectable()
export class ScreenService {
  private readonly logger = new Logger(ScreenService.name);

  constructor(
    @InjectRepository(Screen)
    private screenRepository: Repository<Screen>,
    private recordService: RecordService,
  ) {}

  public async upsert(
    data: Partial<Screen & { recordId: number }>,
  ): Promise<Screen | null> {
    const { recordId, ...screenInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `[SCREEN_UPSERT_SKIP] Record not found for id=${recordId}`,
      );
      return null;
    }

    const screen = await this.screenRepository.upsert(
      { record: { id: recordId }, type: "screenPreview", ...screenInfo },
      { conflictPaths: { record: true, type: true } },
    );

    const saved = await this.screenRepository.save(screen.generatedMaps[0]);
    this.logger.debug(`[SCREEN_UPSERT] recordId=${recordId}`);
    return saved;
  }

  public async findByRecordId(recordId: number): Promise<Screen[]> {
    return this.screenRepository.find({
      where: { record: { id: recordId }, type: null },
      order: { timestamp: "ASC" },
    });
  }

  public async findLatest(recordId: number): Promise<Screen | null> {
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
      order: { timestamp: "DESC" },
    });
  }

  // 별칭 메서드 (기존 코드와 호환성 유지)
  public async findScreens(recordId: number): Promise<Screen[]> {
    return this.findByRecordId(recordId);
  }

  public async findLatestScreen(recordId: number): Promise<Screen | null> {
    return this.findLatest(recordId);
  }
}
