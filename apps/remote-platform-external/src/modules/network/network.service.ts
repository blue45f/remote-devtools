import { Injectable, Logger } from "@nestjs/common";
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
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,

    private recordService: RecordService,
  ) {}

  // TODO: Partial 대신 다른 방법 검토 필요
  public async create(
    data: Partial<Network & { recordId: number }>,
  ): Promise<Network | null> {
    const { recordId, ...networkInfo } = data;

    if (!recordId) {
      this.logger.warn("[NETWORK_CREATE_SKIP] recordId is missing");
      return null;
    }

    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `[NETWORK_CREATE_SKIP] Record not found for id=${recordId}`,
      );
      return null;
    }

    const requestIdRaw = networkInfo.requestId;
    const requestId =
      typeof requestIdRaw === "number" ? requestIdRaw : Number(requestIdRaw);
    const timestampRaw = networkInfo.timestamp;
    const timestamp =
      typeof timestampRaw === "number" ? timestampRaw : Number(timestampRaw);

    if (!Number.isFinite(requestId)) {
      this.logger.warn(
        `[NETWORK_CREATE_SKIP] Invalid requestId for record=${recordId}. value=${String(requestIdRaw)}`,
      );
      return null;
    }

    // Network 데이터를 만들고 Record와 연결합니다.
    const network = this.networkRepository.create({
      ...networkInfo,
      requestId,
      timestamp,
      record, // Record와 연관시킴
    });

    const saved = await this.networkRepository.save(network);
    this.logger.debug(
      `[NETWORK_CREATE] recordId=${recordId}, requestId=${requestId}, timestamp=${timestamp}, id=${saved.id}`,
    );
    return saved;
  }

  public async findNetworks(recordId: number): Promise<Network[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  public async updateResponseBody(data: UpdateResponseBody): Promise<void> {
    const record = await this.recordService.findOne(data.recordId);
    if (!record) {
      throw new Error("Record not found");
    }

    const [seconds, nanoseconds] = process.hrtime();
    const timestamp = seconds * 1e9 + nanoseconds;

    const requestId = Number(data.requestId);
    if (!Number.isFinite(requestId)) {
      this.logger.warn(
        `[NETWORK_UPDATE_BODY_SKIP] Invalid requestId for record=${data.recordId}. value=${String(data.requestId)}`,
      );
      return;
    }

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

    // Race Condition 으로 인해 Network 가 없는 시점에 update를 시도하려고 하는 경우가 발생할 수 있음.
    // 따라서 response body 용 Network를 새로 생성합니다.
    await this.networkRepository.insert({
      record,
      requestId,
      base64Encoded: data.base64Encoded,
      responseBody: bodyToSave,
      protocol: null,
      timestamp,
    });

    this.logger.debug(
      `[NETWORK_UPDATE_BODY] recordId=${data.recordId}, requestId=${requestId}, base64=${data.base64Encoded}`,
    );
  }
}
