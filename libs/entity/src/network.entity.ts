// 특정 페이지의 Network 탭

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Record } from "./record.entity";

@Entity()
export class Network {
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

  // Network는 하나의 Record와 연결됨
  @ManyToOne(() => Record, (record) => record.networks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: Record;
}
