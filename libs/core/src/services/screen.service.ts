import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ScreenEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * 녹화 세션 중 캡처된 화면 스냅샷을 저장하고 조회하는 서비스.
 */
@Injectable()
export class ScreenService {
  private readonly logger = new Logger(ScreenService.name);

  constructor(
    @InjectRepository(ScreenEntity)
    private readonly screenRepository: Repository<ScreenEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * 지정된 녹화 레코드에 대한 화면 미리보기 스냅샷을 삽입하거나 업데이트한다.
   * 충돌 해결은 (record, type) 쌍을 기준으로 한다.
   * @param data - 화면 엔티티의 부분 데이터 (recordId 포함)
   * @returns 저장된 ScreenEntity 또는 null
   */
  public async upsert(
    data: Partial<ScreenEntity & { recordId: number }>,
  ): Promise<ScreenEntity | null> {
    const { recordId, ...screenInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping screen upsert: record not found for id=${recordId}`,
      );
      return null;
    }

    await this.screenRepository.upsert(
      { record: { id: recordId }, type: "screenPreview", ...screenInfo },
      { conflictPaths: { record: true, type: true } },
    );

    this.logger.debug(`Screen upserted: recordId=${recordId}`);
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
    });
  }

  /**
   * 특정 녹화 레코드의 미리보기를 제외한 모든 화면 항목을 타임스탬프 오름차순으로 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns ScreenEntity 배열
   */
  public async findByRecordId(recordId: number): Promise<ScreenEntity[]> {
    return this.screenRepository.find({
      where: { record: { id: recordId }, type: null },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * 특정 녹화 레코드의 가장 최근 화면 미리보기 스냅샷을 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns 최신 ScreenEntity 또는 null
   */
  public async findLatest(recordId: number): Promise<ScreenEntity | null> {
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
      order: { timestamp: "DESC" },
    });
  }

  /**
   * {@link findByRecordId}의 별칭 (하위 호환성을 위해 유지).
   * @param recordId - 녹화 레코드 ID
   * @returns ScreenEntity 배열
   */
  public async findScreens(recordId: number): Promise<ScreenEntity[]> {
    return this.findByRecordId(recordId);
  }

  /**
   * {@link findLatest}의 별칭 (하위 호환성을 위해 유지).
   * @param recordId - 녹화 레코드 ID
   * @returns 최신 ScreenEntity 또는 null
   */
  public async findLatestScreen(
    recordId: number,
  ): Promise<ScreenEntity | null> {
    return this.findLatest(recordId);
  }
}
