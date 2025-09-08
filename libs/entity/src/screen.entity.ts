import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** Screen capture snapshot for a recording session. */
@Entity("screen")
@Unique(["record", "type"])
export class ScreenEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "text", nullable: true, default: null })
  public type: "screenPreview" | null;

  @Column({ name: "event_type", type: "varchar", length: 50, nullable: true })
  public eventType:
    | "full_snapshot"
    | "incremental_snapshot"
    | "user_interaction"
    | "viewport_change"
    | "session_start"
    | "session_end"
    | null;

  @Column({ type: "jsonb" })
  public protocol: object;

  /**
   * Timestamp stored as bigint. The transformer returns it as a string
   * from the database, but the application accepts both string and number.
   */
  @Column({
    type: "bigint",
    transformer: {
      to: (value: any) => value,
      from: (value: string) => value,
    },
  })
  public timestamp: string | number;

  @Column({ type: "integer", nullable: true })
  public sequence: number | null;

  /** Each screen entry belongs to exactly one RecordEntity. */
  @ManyToOne(() => RecordEntity, (record) => record.screens, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
