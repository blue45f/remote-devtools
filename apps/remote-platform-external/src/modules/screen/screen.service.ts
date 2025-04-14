import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Screen } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

@Injectable()
export class ScreenService {
  constructor(
    @InjectRepository(Screen)
    private screenRepository: Repository<Screen>,
    private recordService: RecordService,
  ) {}

  public async upsert(
    data: Partial<Screen & { recordId: number }>,
  ): Promise<Screen> {
    const { recordId, ...screenInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      console.error("Record not found");
      return;
    }

    const screen = await this.screenRepository.upsert(
      { record: { id: recordId }, type: "screenPreview", ...screenInfo },
      { conflictPaths: { record: true, type: true } },
    );

    return this.screenRepository.save(screen.generatedMaps[0]);
  }

  public async findScreens(recordId: number): Promise<Screen[]> {
    return this.screenRepository.find({
      where: { record: { id: recordId }, type: null },
      order: { timestamp: "ASC" },
    });
  }

  public async findLatestScreen(recordId: number): Promise<Screen> {
    return this.screenRepository.findOne({
      where: { record: { id: recordId }, type: "screenPreview" },
      order: { timestamp: "DESC" },
    });
  }
}
