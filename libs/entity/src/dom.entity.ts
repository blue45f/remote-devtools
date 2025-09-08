import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** DOM snapshot captured for a recording session. */
@Entity("dom")
@Unique(["record", "type"])
export class DomEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "text", nullable: true, default: null })
  public type: "entireDom" | null;

  @Column({ type: "jsonb" })
  public protocol: object;

  @Column({ type: "bigint" })
  public timestamp: number;

  /** Each DOM entry belongs to exactly one RecordEntity. */
  @ManyToOne(() => RecordEntity, (record) => record.doms, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
