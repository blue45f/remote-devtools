import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DataSource } from "typeorm";

@Injectable()
export class RemoveRecordService {
  private readonly logger = new Logger(RemoveRecordService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Scheduled job: runs on the 1st of every month at 03:00.
   * Deletes records older than 14 days in batches of 1000, excluding protected records.
   */
  @Cron("0 3 1 * *")
  public async removeRecordOldRecords(): Promise<void> {
    this.logger.log("Monthly record cleanup job started");

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
            AND id <> 3462 -- Protect specific recordId
            LIMIT 1000
          )
          RETURNING id
        )
        SELECT COUNT(*) FROM deleted;
      `);

      const deletedCount = parseInt(result[0].count, 10);
      this.logger.log(
        `Record cleanup complete: ${deletedCount} records deleted`,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Error during record cleanup", err);
    } finally {
      await queryRunner.release();
    }
  }
}
