import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import pRetry from "p-retry";
import { Repository } from "typeorm";

import { BusinessException } from "@remote-platform/common";
import { NetworkEntity } from "@remote-platform/entity";

import { RecordService } from "./record.service";

/**
 * Maximum number of retry attempts when looking up network entries.
 */
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Delay (in milliseconds) between retry attempts.
 */
const RETRY_DELAY_MS = 500;

/**
 * 기존 네트워크 항목에 응답 본문을 삽입하기 위한 페이로드.
 */
export interface UpdateResponseBodyData {
  /** 대상 녹화 레코드 ID */
  readonly recordId: number;
  /** 대상 요청 ID */
  readonly requestId: number;
  /** 응답 본문 데이터 */
  readonly body: string;
  /** Base64 인코딩 여부 */
  readonly base64Encoded: boolean;
}

/**
 * 녹화 세션 중 캡처된 네트워크 트래픽을 저장하고 조회하는 서비스.
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
   * 기존 녹화 레코드에 연결된 새 네트워크 항목을 생성한다.
   * 필수 필드가 누락되었거나 유효하지 않은 경우 null을 반환한다.
   * @param data - 네트워크 엔티티의 부분 데이터 (recordId 포함)
   * @returns 저장된 NetworkEntity 또는 null
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

  /**
   * 특정 녹화 레코드의 모든 네트워크 항목을 타임스탬프 오름차순으로 조회한다.
   * @param recordId - 녹화 레코드 ID
   * @returns NetworkEntity 배열
   */
  public async findByRecordId(recordId: number): Promise<NetworkEntity[]> {
    return this.networkRepository.find({
      where: { record: { id: recordId } },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * {@link findByRecordId}의 별칭 (하위 호환성을 위해 유지).
   * @param recordId - 녹화 레코드 ID
   * @returns NetworkEntity 배열
   */
  public async findNetworks(recordId: number): Promise<NetworkEntity[]> {
    return this.findByRecordId(recordId);
  }

  /**
   * 기존 네트워크 항목의 응답 본문을 조회하여 업데이트한다.
   * 응답 본문 도착 시 네트워크 항목이 아직 저장되지 않았을 수 있으므로
   * 재시도 메커니즘을 사용한다.
   * Base64가 아닌 JSON 본문은 정규화를 위해 재직렬화한다.
   * @param data - 응답 본문 업데이트 페이로드
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
   * 레코드와 requestId로 네트워크 항목을 조회하며,
   * 최대 {@link retries}회까지 각 시도 사이에 지연을 두고 재시도한다.
   * @param record - 대상 레코드 (id 포함)
   * @param requestId - 대상 요청 ID
   * @param retries - 최대 재시도 횟수 (기본값: MAX_RETRY_ATTEMPTS)
   * @param delay - 재시도 간 지연 시간 (밀리초, 기본값: RETRY_DELAY_MS)
   * @returns 조회된 NetworkEntity 또는 null
   */
  private async findNetworkWithRetry(
    record: { id: number },
    requestId: number,
  ): Promise<NetworkEntity | null> {
    try {
      return await pRetry(
        async () => {
          const network = await this.networkRepository.findOne({
            where: { record: { id: record.id }, requestId },
          });
          if (!network) throw new Error("Not found yet");
          return network;
        },
        {
          retries: MAX_RETRY_ATTEMPTS,
          minTimeout: RETRY_DELAY_MS,
          maxTimeout: RETRY_DELAY_MS,
          factor: 1,
        },
      );
    } catch {
      return null;
    }
  }
}
