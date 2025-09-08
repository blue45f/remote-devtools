import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** Captured network request/response entry for a recording session. */
@Entity("network")
export class NetworkEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "int" })
  public requestId: number;

  @Column({ type: "text", nullable: true, default: null })
  public responseBody: string | null;

  @Column({ type: "bool", nullable: true, default: null })
  public base64Encoded: boolean | null;

  @Column({ type: "jsonb", nullable: true, default: null })
  public protocol: object | null;

  @Column({ type: "bigint" })
  public timestamp: number;

  /** Each network entry belongs to exactly one RecordEntity. */
  @ManyToOne(() => RecordEntity, (record) => record.networks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
