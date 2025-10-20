import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RuntimeEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * 녹화 세션 중 캡처된 런타임 콘솔 메시지를 저장하고 조회하는 서비스.
 */
@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(
    @InjectRepository(RuntimeEntity)
    private readonly runtimeRepository: Repository<RuntimeEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * 기존 녹화 레코드에 연결된 새 런타임 항목을 생성한다.
   * 부모 레코드를 찾을 수 없으면 null을 반환한다.
   * @param data - 런타임 엔티티의 부분 데이터 (recordId 포함)
   * @returns 저장된 RuntimeEntity 또는 null
   */
  public async create(
    data: Partial<RuntimeEntity & { recordId: number }>,
  ): Promise<RuntimeEntity | null> {
    const { recordId, ...runtimeInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping runtime creation: record not found for id=${recordId}`,
      );
      return null;
    }

    const runtime = this.runtimeRepository.create({
      ...runtimeInfo,
      record,
    });

    const saved = await this.runtimeRepository.save(runtime);
    this.logger.debug(
      `Runtime entry created: recordId=${recordId}, id=${saved.id}`,
    );
    return saved;
  }

  /**
   * 특정 녹화 레코드의 모든 런타임 항목을 타임스탬프 오름차순으로 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns RuntimeEntity 배열
   */
  public async findByRecordId(recordId: number): Promise<RuntimeEntity[]> {
    return this.runtimeRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * {@link findByRecordId}의 별칭 (하위 호환성을 위해 유지).
   * @param recordId - 녹화 레코드 ID
   * @returns RuntimeEntity 배열
   */
  public async findRuntimes(recordId: number): Promise<RuntimeEntity[]> {
    return this.findByRecordId(recordId);
  }
}
