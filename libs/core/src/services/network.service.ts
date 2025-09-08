import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BusinessException } from "@remote-platform/common";
import { NetworkEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/** Payload for inserting a response body into an existing network entry. */
export interface UpdateResponseBodyData {
  readonly recordId: number;
  readonly requestId: number;
  readonly body: string;
  readonly base64Encoded: boolean;
}

/**
 * Service responsible for persisting and querying network traffic
 * captured during a recording session.
 */
@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectRepository(NetworkEntity)
    private readonly networkRepository: Repository<NetworkEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * Create a new network entry linked to an existing record.
   * Returns null when required fields are missing or invalid.
   */
  public async create(
    data: Partial<NetworkEntity & { recordId: number }>,
  ): Promise<NetworkEntity | null> {
    const { recordId, ...networkInfo } = data;

    if (!recordId) {
      this.logger.warn("Skipping network creation: recordId is missing");
      return null;
    }

    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.warn(
        `Skipping network creation: record not found for id=${recordId}`,
      );
      return null;
    }

    const requestId =
      typeof networkInfo.requestId === "number"
        ? networkInfo.requestId
        : Number(networkInfo.requestId);
    const timestamp =
      typeof networkInfo.timestamp === "number"
        ? networkInfo.timestamp
        : Number(networkInfo.timestamp);

    if (!Number.isFinite(requestId)) {
      this.logger.warn(
        `Skipping network creation: invalid requestId for record=${recordId}, value=${String(networkInfo.requestId)}`,
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
      `Network entry created: recordId=${recordId}, requestId=${requestId}, id=${saved.id}`,
    );
    return saved;
  }

  /** Retrieve all network entries for a record, ordered by timestamp ascending. */
  public async findByRecordId(recordId: number): Promise<NetworkEntity[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /** Alias for {@link findByRecordId} (retained for backward compatibility). */
  public async findNetworks(recordId: number): Promise<NetworkEntity[]> {
    return this.findByRecordId(recordId);
  }

  /**
   * Find and update the response body on an existing network entry.
   * Uses a retry mechanism because the network entry may not have been
   * persisted yet when the response body arrives.
   * If the body is non-base64 JSON, it is re-serialized for normalization.
   */
  public async updateResponseBody(data: UpdateResponseBodyData): Promise<void> {
    const record = await this.recordService.findOne(data.recordId);
    if (!record) {
      throw BusinessException.resourceNotFound("Record", {
        recordId: data.recordId,
      });
    }

    const requestId = Number(data.requestId);
    if (!Number.isFinite(requestId)) {
      this.logger.warn(
        `Skipping response body update: invalid requestId for record=${data.recordId}, value=${String(data.requestId)}`,
      );
      return;
    }

    const network = await this.findNetworkWithRetry(record, requestId);
    if (!network) {
      this.logger.warn(
        `Network entry not found after retries: recordId=${data.recordId}, requestId=${requestId}`,
      );
      return;
    }

    let bodyToSave = data.body;
    if (!data.base64Encoded && bodyToSave) {
      try {
        const parsed = JSON.parse(bodyToSave);
        bodyToSave = JSON.stringify(parsed);
      } catch {
        // Not valid JSON; keep the original body as-is
      }
    }

    network.responseBody = bodyToSave;
    network.base64Encoded = data.base64Encoded;
    await this.networkRepository.save(network);

    this.logger.debug(
      `Response body saved: recordId=${data.recordId}, requestId=${requestId}`,
    );
  }

  /**
   * Attempts to find a network entry by record and requestId, retrying
   * up to {@link retries} times with a delay between each attempt.
   */
  private async findNetworkWithRetry(
    record: { id: number },
    requestId: number,
    retries = 5,
    delay = 500,
  ): Promise<NetworkEntity | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const network = await this.networkRepository.findOne({
        where: { record: { id: record.id }, requestId },
      });
      if (network) return network;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return null;
  }
}
