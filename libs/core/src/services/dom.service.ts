import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MSG_ID } from "@remote-platform/constants";
import { DomEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * 녹화 세션 중 캡처된 DOM 스냅샷을 저장하고 조회하는 서비스.
 */
@Injectable()
export class DomService {
  private readonly logger = new Logger(DomService.name);

  constructor(
    @InjectRepository(DomEntity)
    private readonly domRepository: Repository<DomEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * CDP 응답 메시지가 DOM.enable에 해당하는지 확인한다.
   * @param id - CDP 메시지 ID
   * @returns DOM.enable 응답 여부
   */
  public isEnableDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.ENABLE;
  }

  /**
   * CDP 응답 메시지가 DOM.getDocument에 해당하는지 확인한다.
   * @param id - CDP 메시지 ID
   * @returns DOM.getDocument 응답 여부
   */
  public isGetDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.GET_DOCUMENT;
  }

  /**
   * CDP 요청 메시지가 DOM.getDocument 호출인지 확인한다.
   * @param message - CDP 요청 메시지 객체
   * @returns DOM.getDocument 요청 여부
   */
  public isGetDomRequestMessage(message: Record<string, unknown>): boolean {
    return message["method"] === "DOM.getDocument";
  }

  /**
   * 지정된 녹화 레코드에 대한 DOM 스냅샷을 삽입하거나 업데이트한다.
   * 충돌 해결은 (record, type) 쌍을 기준으로 한다.
   * @param data - DOM 엔티티의 부분 데이터 (recordId, type 필수)
   * @returns 저장된 DomEntity 또는 null
   */
  public async upsert(
    data: Partial<DomEntity> & { recordId: number } & Pick<DomEntity, "type">,
  ): Promise<DomEntity | null> {
    const { recordId, ...domInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping DOM upsert: record not found for id=${recordId}`,
      );
      return null;
    }

    await this.domRepository.upsert(
      { record: { id: recordId }, ...domInfo },
      { conflictPaths: { record: true, type: true } },
    );

    this.logger.debug(
      `DOM upserted: recordId=${recordId}, type=${domInfo.type}`,
    );
    return this.domRepository.findOne({
      where: { record: { id: recordId }, type: domInfo.type },
    });
  }

  /**
   * 특정 녹화 레코드의 모든 DOM 항목을 타임스탬프 오름차순으로 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns DomEntity 배열
   */
  public async findByRecordId(recordId: number): Promise<DomEntity[]> {
    return this.domRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * 특정 녹화 레코드의 전체 DOM 스냅샷(type = "entireDom")을 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns 전체 DOM 스냅샷 DomEntity 또는 null
   */
  public async findEntireDom(recordId: number): Promise<DomEntity | null> {
    return this.domRepository.findOne({
      where: { record: { id: recordId }, type: "entireDom" },
    });
  }
}
