import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** 녹화 세션에서 캡처된 DOM 스냅샷. */
@Entity("dom")
@Unique(["record", "type"])
export class DomEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** DOM 스냅샷 유형 ('entireDom': 전체 DOM 캡처). */
  @Column({ type: "text", nullable: true, default: null })
  public type: "entireDom" | null;

  /** CDP(Chrome DevTools Protocol) DOM 이벤트 데이터 (JSON). */
  @Column({ type: "jsonb" })
  public protocol: object;

  /** DOM 캡처 시점의 타임스탬프 (bigint). */
  @Column({ type: "bigint" })
  public timestamp: number;

  /** 이 DOM 항목이 속한 녹화 세션. */
  @ManyToOne(() => RecordEntity, (record) => record.doms, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
