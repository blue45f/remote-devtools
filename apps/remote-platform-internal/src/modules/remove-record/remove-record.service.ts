import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DataSource } from "typeorm";

/**
 * Protected record ID that should never be deleted.
 * This record contains critical reference data used for system testing and validation.
 */
const PROTECTED_RECORD_ID = 3462;

/**
 * Number of days after which records are eligible for deletion.
 */
const RECORD_RETENTION_DAYS = 14;

/**
 * Maximum number of records to delete in a single batch operation.
 * Prevents long-running transactions and database locks.
 */
const DELETION_BATCH_SIZE = 1000;

@Injectable()
export class RemoveRecordService {
  private readonly logger = new Logger(RemoveRecordService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Scheduled job: runs on the 1st of every month at 03:00.
   * Deletes records older than RECORD_RETENTION_DAYS in batches, excluding protected records.
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
            WHERE timestamp < NOW() - INTERVAL '${RECORD_RETENTION_DAYS} days'
            AND id <> ${PROTECTED_RECORD_ID}
            LIMIT ${DELETION_BATCH_SIZE}
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
