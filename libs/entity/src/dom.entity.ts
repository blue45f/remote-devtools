// 특정 페이지의 Dom 탭

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Record } from "./record.entity";

@Entity()
@Unique(["record", "type"])
export class Dom {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "text", nullable: true, default: null })
  public type: "entireDom" | null;

  @Column({ type: "jsonb" })
  public protocol: object;

  @Column({ type: "bigint" })
  public timestamp: number;

  // Dom은 하나의 Record와 연결됨
  @ManyToOne(() => Record, (record) => record.doms, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: Record;
}
