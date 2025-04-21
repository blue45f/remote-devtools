import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DataSource } from "typeorm";

@Injectable()
export class RemoveRecordService {
  private readonly logger = new Logger(RemoveRecordService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ✅ 매월 1일 오전 3시 실행
  @Cron("0 3 1 * *")
  public async removeRecordOldRecords(): Promise<void> {
    this.logger.log("🧪 매월 1일 03시 - record 정리 작업 시작");

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.query(`
        WITH deleted AS (
          DELETE FROM record
          WHERE id IN (
            SELECT id FROM record
            WHERE timestamp < NOW() - INTERVAL '14 days'
            AND id <> 3462 -- 특정 recordId 보호
            LIMIT 1000
          )
          RETURNING id
        )
        SELECT COUNT(*) FROM deleted;
      `);

      const deletedCount = parseInt(result[0].count, 10);
      this.logger.log(`🧼 삭제 완료: ${deletedCount}개 삭제됨`);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("❌ 삭제 중 오류 발생", err);
    } finally {
      await queryRunner.release();
    }
  }
}
