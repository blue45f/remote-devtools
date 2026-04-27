import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** 녹화 세션에서 캡처된 런타임 콘솔 메시지. */
@Entity("runtime")
@Index(["record", "timestamp"])
@Index(["orgId", "timestamp"])
export class RuntimeEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 멀티테넌트 격리용 조직 ID (RecordEntity와 동일). NULL은 self-host 단일 테넌트. */
  @Column({ name: "org_id", type: "uuid", nullable: true })
  public orgId?: string | null;

  /** CDP(Chrome DevTools Protocol) 런타임 이벤트 데이터 (JSON). */
  @Column({ type: "jsonb" })
  public protocol: object;

  /** 런타임 이벤트 발생 시각 (bigint 타임스탬프). */
  @Column({ type: "bigint" })
  public timestamp: string | number;

  /** 이 런타임 항목이 속한 녹화 세션. */
  @ManyToOne(() => RecordEntity, (record) => record.runtimes, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
