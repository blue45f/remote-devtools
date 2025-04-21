import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Network } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

export type UpdateResponseBody = {
  recordId: number;
  requestId: number;
  body: string;
  base64Encoded: boolean;
};

@Injectable()
export class NetworkService {
  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,

    private recordService: RecordService,
  ) {}

  // TODO: Partial 대신 다른 방법 검토 필요
  public async create(
    data: Partial<Network & { recordId: number }>,
  ): Promise<Network> {
    const { recordId, ...networkInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      console.error("Record not found");
      return;
    }

    // Network 데이터를 만들고 Record와 연결합니다.
    const network = this.networkRepository.create({
      ...networkInfo,
      record, // Record와 연관시킴
    });

    return this.networkRepository.save(network);
  }

  public async findNetworks(recordId: number): Promise<Network[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  // findByRecordId 메서드 추가 (findNetworks와 동일한 기능)
  public async findByRecordId(recordId: number): Promise<Network[]> {
    return this.findNetworks(recordId);
  }

  private async findNetworkWithRetry(
    record: any,
    requestId: number,
    retries = 5,
    delay = 500,
  ): Promise<Network> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const network = await this.networkRepository.findOne({
        where: { record, requestId },
      });
      if (network) return network;

      // 레코드가 없으면 지연 후 재시도
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("Network record not found after multiple attempts");
  }

  public async updateResponseBody(data: UpdateResponseBody): Promise<void> {
    const record = await this.recordService.findOne(data.recordId);
    if (!record) {
      throw new Error("Record not found");
    }
    const network = await this.findNetworkWithRetry(record, data.requestId);

    // record와 requestId로 Network를 업데이트합니다.
    // JSON 유효성 확인 및 minified 형태로 저장
    let bodyToSave = data.body;
    if (!data.base64Encoded && bodyToSave) {
      try {
        // JSON인 경우 minified 형태로 저장 (DevTools가 pretty print 처리)
        const parsed = JSON.parse(bodyToSave);
        bodyToSave = JSON.stringify(parsed);
      } catch {
        // JSON이 아닌 경우 원본 그대로
      }
    }

    network.responseBody = bodyToSave;
    network.base64Encoded = data.base64Encoded;
    await this.networkRepository.save(network);
  }
}
