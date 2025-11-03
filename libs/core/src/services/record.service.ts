import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RecordEntity } from "@remote-platform/entity";

/**
 * 녹화 세션의 생명주기를 관리하는 서비스.
 * RecordEntity에 대한 CRUD 및 조회 기능을 제공한다.
 */
@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /**
   * 새 녹화 세션을 생성하고 저장한다.
   * @param data - 녹화 엔티티의 부분 데이터
   * @returns 저장된 RecordEntity
   */
  public async create(data: Partial<RecordEntity>): Promise<RecordEntity> {
    const record = this.recordRepository.create(data);
    const saved = await this.recordRepository.save(record);
    this.logger.debug(`Record created: id=${saved.id}, name=${saved.name}`);
    return saved;
  }

  /**
   * 기본 키로 단일 녹화 레코드를 조회한다.
   * @param id - 녹화 레코드의 기본 키
   * @returns 해당 RecordEntity 또는 null
   */
  public async findOne(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({ where: { id } });
  }

  /**
   * 모든 녹화 레코드를 조회한다.
   * @returns RecordEntity 배열
   */
  public async findAll(): Promise<RecordEntity[]> {
    return this.recordRepository.find({ take: 100 });
  }

  /**
   * 특정 디바이스에서 현재 레코드 이전에 생성된 모든 녹화 레코드를 조회한다.
   * 최신순으로 정렬하여 반환한다.
   * @param deviceId - 대상 디바이스 ID
   * @param currentRecordId - 기준이 되는 현재 레코드 ID
   * @returns 이전 RecordEntity 배열 (최신순)
   */
  public async findPreviousByDeviceId(
    deviceId: string,
    currentRecordId: number,
  ): Promise<RecordEntity[]> {
    const currentRecord = await this.recordRepository.findOne({
      where: { id: currentRecordId },
    });

    if (!currentRecord) {
      return [];
    }

    return this.recordRepository
      .createQueryBuilder("record")
      .where("record.device_id = :deviceId", { deviceId })
      .andWhere("record.timestamp < :currentTimestamp", {
        currentTimestamp: currentRecord.timestamp,
      })
      .orderBy("record.timestamp", "DESC")
      .getMany();
  }

  /**
   * 연관된 네트워크 항목을 함께 즉시 로드하여 녹화 레코드를 조회한다.
   * @param id - 녹화 레코드의 기본 키
   * @returns 네트워크 관계가 포함된 RecordEntity 또는 null
   */
  public async findWithNetworks(id: number): Promise<RecordEntity | null> {
    return this.recordRepository.findOne({
      where: { id },
      relations: ["networks"],
    });
  }

  /**
   * 기존 녹화 레코드의 재생 시간(나노초)을 업데이트한다.
   * @param id - 녹화 레코드의 기본 키
   * @param duration - 재생 시간 (나노초 단위)
   */
  public async updateDuration(id: number, duration: number): Promise<void> {
    await this.recordRepository.update(id, { duration });
    this.logger.debug(
      `Record duration updated: id=${id}, duration=${duration}`,
    );
  }

  /**
   * 기본 키로 녹화 레코드를 삭제한다.
   * @param id - 삭제할 녹화 레코드의 기본 키
   */
  public async delete(id: number): Promise<void> {
    await this.recordRepository.delete(id);
    this.logger.debug(`Record deleted: id=${id}`);
  }
}
