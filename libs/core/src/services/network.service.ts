import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Network } from "@remote-platform/entity";

import { RecordService } from "./record.service";

export interface UpdateResponseBodyData {
  recordId: number;
  requestId: number;
  body: string;
  base64Encoded: boolean;
}

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,
    private recordService: RecordService,
  ) {}

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

    const network = this.networkRepository.create({
      ...networkInfo,
      requestId,
      timestamp,
      record,
    });

    const saved = await this.networkRepository.save(network);
    this.logger.debug(
      `[NETWORK_CREATE] recordId=${recordId}, requestId=${requestId}, id=${saved.id}`,
    );
    return saved;
  }

  public async findByRecordId(recordId: number): Promise<Network[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  // 별칭 메서드 (기존 코드와 호환성 유지)
  public async findNetworks(recordId: number): Promise<Network[]> {
    return this.findByRecordId(recordId);
  }

  public async updateResponseBody(data: UpdateResponseBodyData): Promise<void> {
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

    let bodyToSave = data.body;
    if (!data.base64Encoded && bodyToSave) {
      try {
        const parsed = JSON.parse(bodyToSave);
        bodyToSave = JSON.stringify(parsed);
      } catch {
        // JSON이 아닌 경우 원본 그대로
      }
    }

    await this.networkRepository.insert({
      record,
      requestId,
      base64Encoded: data.base64Encoded,
      responseBody: bodyToSave,
      protocol: null,
      timestamp,
    });

    this.logger.debug(
      `[NETWORK_UPDATE_BODY] recordId=${data.recordId}, requestId=${requestId}`,
    );
  }
}
