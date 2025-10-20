import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** 녹화 세션의 화면 캡처 스냅샷. */
@Entity("screen")
@Unique(["record", "type"])
export class ScreenEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 화면 캡처 유형 ('screenPreview': 미리보기용 스냅샷). */
  @Column({ type: "text", nullable: true, default: null })
  public type: "screenPreview" | null;

  /** 화면 이벤트 유형 (전체 스냅샷, 증분 스냅샷, 사용자 상호작용 등). */
  @Column({ name: "event_type", type: "varchar", length: 50, nullable: true })
  public eventType:
    | "full_snapshot"
    | "incremental_snapshot"
    | "user_interaction"
    | "viewport_change"
    | "session_start"
    | "session_end"
    | null;

  /** CDP(Chrome DevTools Protocol) 화면 이벤트 데이터 (JSON). */
  @Column({ type: "jsonb" })
  public protocol: object;

  /**
   * bigint로 저장되는 타임스탬프.
   * DB에서 문자열로 반환되지만, 애플리케이션에서는 문자열과 숫자 모두 허용.
   */
  @Column({
    type: "bigint",
    transformer: {
      to: (value: any) => value,
      from: (value: string) => value,
    },
  })
  public timestamp: string | number;

  /** 화면 이벤트의 순서 번호 (정렬용). */
  @Column({ type: "integer", nullable: true })
  public sequence: number | null;

  /** 이 화면 항목이 속한 녹화 세션. */
  @ManyToOne(() => RecordEntity, (record) => record.screens, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
