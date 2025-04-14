import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MSG_ID } from "@remote-platform/constants";
import { Dom } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class DomService {
  constructor(
    @InjectRepository(Dom)
    private domRepository: Repository<Dom>,
    private recordService: RecordService,
  ) {}

  public isEnableDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.ENABLE;
  }
  public isGetDomResponseMessage(id?: number): boolean {
    return id === MSG_ID.DOM.GET_DOCUMENT;
  }

  public async upsert(
    data: Partial<Dom> & { recordId: number } & Pick<Dom, "type">,
  ): Promise<Dom> {
    const { recordId, ...domInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      console.error("Record not found");
      return;
    }

    const dom = await this.domRepository.upsert(
      { record: { id: recordId }, ...domInfo },
      { conflictPaths: { record: true, type: true } },
    );

    return this.domRepository.save(dom.generatedMaps[0]);
  }
}
