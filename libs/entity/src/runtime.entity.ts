import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** Runtime console message captured for a recording session. */
@Entity("runtime")
export class RuntimeEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "jsonb" })
  public protocol: object;

  @Column({ type: "bigint" })
  public timestamp: number;

  /** Each runtime entry belongs to exactly one RecordEntity. */
  @ManyToOne(() => RecordEntity, (record) => record.runtimes, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
