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
   * Create a new network entry and associate it with the given record.
   */
  public async create(
    data: Partial<NetworkEntity & { recordId: number }>,
  ): Promise<NetworkEntity | undefined> {
    const { recordId, ...networkInfo } = data;
    const record = await this.recordService.findOne(recordId);

    if (!record) {
      this.logger.error(`Record not found for id=${recordId}`);
      return undefined;
    }

    const network = this.networkRepository.create({
      ...networkInfo,
      record,
    });

    return this.networkRepository.save(network);
  }

  /**
   * Find all network entries for a given record, ordered by timestamp ascending.
   */
  public async findNetworks(recordId: number): Promise<NetworkEntity[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * Alias for findNetworks (for backward compatibility).
   */
  public async findByRecordId(recordId: number): Promise<NetworkEntity[]> {
    return this.findNetworks(recordId);
  }

  /**
   * Attempt to find a network entry by record and requestId, retrying on failure.
   */
  private async findNetworkWithRetry(
    record: { id: number },
    requestId: number,
    retries = 5,
    delay = 500,
  ): Promise<NetworkEntity> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const network = await this.networkRepository.findOne({
        where: { record: { id: record.id }, requestId },
      });
      if (network) return network;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("Network record not found after multiple attempts");
  }

  /**
   * Update the response body of an existing network entry.
   * If the body is valid JSON (and not base64-encoded), it is stored in minified form.
   */
  public async updateResponseBody(data: UpdateResponseBody): Promise<void> {
    const record = await this.recordService.findOne(data.recordId);
    if (!record) {
      throw new Error("Record not found");
    }
    const network = await this.findNetworkWithRetry(record, data.requestId);

    let bodyToSave = data.body;
    if (!data.base64Encoded && bodyToSave) {
      try {
        // Store JSON in minified form (DevTools handles pretty-printing)
        const parsed = JSON.parse(bodyToSave);
        bodyToSave = JSON.stringify(parsed);
      } catch {
        // Not JSON; store as-is
      }
    }

    network.responseBody = bodyToSave;
    network.base64Encoded = data.base64Encoded;
    await this.networkRepository.save(network);
  }
}
