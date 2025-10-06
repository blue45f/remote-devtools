import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MSG_ID } from "@remote-platform/constants";
import { DomEntity } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class DomService {
  private readonly logger = new Logger(DomService.name);

  constructor(
    @InjectRepository(DomEntity)
    private readonly domRepository: Repository<DomEntity>,

    private readonly recordService: RecordService,
  ) {}

  public isEnableDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.ENABLE;
  }

  public isGetDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.GET_DOCUMENT;
  }

  public isGetDomRequestMessage(message: object): boolean {
    return message["method"] === "DOM.getDocument";
  }

  /**
   * Insert or update a DOM entry for the given record.
   */
  public async upsert(
    data: Partial<DomEntity> & { recordId: number } & Pick<DomEntity, "type">,
  ): Promise<DomEntity | undefined> {
    const { recordId, ...domInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.error(`Record not found for id=${recordId}`);
      return undefined;
    }

    const dom = await this.domRepository.upsert(
      { record: { id: recordId }, ...domInfo },
      { conflictPaths: { record: true, type: true } },
    );

    return this.domRepository.save(dom.generatedMaps[0]);
  }

  /**
   * Find all DOM entries for a given record, ordered by timestamp ascending.
   */
  public async findDoms(recordId: number): Promise<DomEntity[]> {
    return this.domRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * Find the entire DOM snapshot for a given record.
   */
  public async findEntireDom(recordId: number): Promise<DomEntity> {
    return this.domRepository.findOne({
      where: { record: { id: recordId }, type: "entireDom" },
    });
  }
}
