// 특정 페이지의 Runtime 탭

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Record } from "./record.entity";

@Entity()
export class Runtime {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "jsonb" })
  public protocol: object;

  @Column({ type: "bigint" })
  public timestamp: number;

  // Runtime은 하나의 Record와 연결됨
  @ManyToOne(() => Record, (record) => record.runtimes, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: Record;
}
