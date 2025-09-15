import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { NetworkEntity } from "@remote-platform/entity";

import { RecordService } from "../record/record.service";

export interface UpdateResponseBody {
  readonly recordId: number;
  readonly requestId: number;
  readonly body: string;
  readonly base64Encoded: boolean;
}

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    @InjectRepository(NetworkEntity)
    private readonly networkRepository: Repository<NetworkEntity>,
    private readonly recordService: RecordService,
  ) {}

  /**
   * Creates a new network entry linked to the specified record.
   * Returns null if the recordId is missing, invalid, or not found.
   */
  public async create(
    data: Partial<NetworkEntity & { recordId: number }>,
  ): Promise<NetworkEntity | null> {
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
      `[NETWORK_CREATE] recordId=${recordId}, requestId=${requestId}, timestamp=${timestamp}, id=${saved.id}`,
    );
    return saved;
  }

  /**
   * Finds all network entries for a given record, ordered by timestamp.
   */
  public async findNetworks(recordId: number): Promise<NetworkEntity[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * Stores the response body for an existing network request.
   * Creates a separate network row to avoid race conditions when
   * the original request entry has not yet been persisted.
   */
  public async updateResponseBody(data: UpdateResponseBody): Promise<void> {
    const record = await this.recordService.findOne(data.recordId);
    if (!record) {
      throw new Error(`Record not found for id=${data.recordId}`);
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

    // Minify JSON bodies before saving (DevTools handles pretty printing)
    let bodyToSave = data.body;
    if (!data.base64Encoded && bodyToSave) {
      try {
        const parsed = JSON.parse(bodyToSave);
        bodyToSave = JSON.stringify(parsed);
      } catch {
        // Not valid JSON; save as-is
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
      `[NETWORK_UPDATE_BODY] recordId=${data.recordId}, requestId=${requestId}, base64=${data.base64Encoded}`,
    );
  }
}
