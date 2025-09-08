import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MSG_ID } from "@remote-platform/constants";
import { DomEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * Service responsible for persisting and querying DOM snapshots
 * captured during a recording session.
 */
@Injectable()
export class DomService {
  private readonly logger = new Logger(DomService.name);

  constructor(
    @InjectRepository(DomEntity)
    private readonly domRepository: Repository<DomEntity>,
    private readonly recordService: RecordService,
  ) {}

  /** Check whether a CDP response message corresponds to DOM.enable. */
  public isEnableDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.ENABLE;
  }

  /** Check whether a CDP response message corresponds to DOM.getDocument. */
  public isGetDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.GET_DOCUMENT;
  }

  /** Check whether a CDP request message is a DOM.getDocument call. */
  public isGetDomRequestMessage(message: Record<string, unknown>): boolean {
    return message["method"] === "DOM.getDocument";
  }

  /**
   * Insert or update a DOM snapshot for the given record.
   * Conflict resolution is based on the (record, type) pair.
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

    const result = await this.domRepository.upsert(
      { record: { id: recordId }, ...domInfo },
      { conflictPaths: { record: true, type: true } },
    );

    const saved = await this.domRepository.save(result.generatedMaps[0]);
    this.logger.debug(
      `DOM upserted: recordId=${recordId}, type=${domInfo.type}`,
    );
    return saved;
  }

  /** Retrieve all DOM entries for a record, ordered by timestamp ascending. */
  public async findByRecordId(recordId: number): Promise<DomEntity[]> {
    return this.domRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /** Retrieve the full DOM snapshot (type = "entireDom") for a record. */
  public async findEntireDom(recordId: number): Promise<DomEntity | null> {
    return this.domRepository.findOne({
      where: { record: { id: recordId }, type: "entireDom" },
    });
  }
}
