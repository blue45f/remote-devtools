import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { RecordEntity } from "./record.entity";

/** 녹화 세션에서 캡처된 네트워크 요청/응답 항목. */
@Entity("network")
export class NetworkEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 네트워크 요청의 고유 식별자. */
  @Column({ type: "int" })
  public requestId: number;

  /** 응답 본문 텍스트 (대용량일 수 있음). */
  @Column({ type: "text", nullable: true, default: null })
  public responseBody: string | null;

  /** 응답 본문이 Base64로 인코딩되었는지 여부. */
  @Column({ type: "bool", nullable: true, default: null })
  public base64Encoded: boolean | null;

  /** CDP(Chrome DevTools Protocol) 네트워크 이벤트 데이터 (JSON). */
  @Column({ type: "jsonb", nullable: true, default: null })
  public protocol: object | null;

  /** 네트워크 이벤트 발생 시각 (bigint 타임스탬프). */
  @Column({ type: "bigint" })
  public timestamp: number;

  /** 이 네트워크 항목이 속한 녹화 세션. */
  @ManyToOne(() => RecordEntity, (record) => record.networks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: RecordEntity;
}
