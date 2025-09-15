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
}
