import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { DomEntity } from "./dom.entity";
import { NetworkEntity } from "./network.entity";
import { RuntimeEntity } from "./runtime.entity";
import { ScreenEntity } from "./screen.entity";

/** 녹화 세션 하나를 나타내는 엔티티. */
@Entity("record")
export class RecordEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 세션 이름 (짧은 라벨). */
  @Column({ type: "varchar" })
  public name: string;

  /** 세션 지속 시간 (나노초 단위). */
  @Column({ type: "bigint", nullable: true })
  public duration: number;

  /** 녹화 중 캡처된 페이지 URL. */
  @Column({ type: "text", nullable: true })
  public url?: string;

  /** 이 녹화를 생성한 디바이스의 고유 식별자. */
  @Column({ name: "device_id", nullable: true, length: 255 })
  public deviceId: string;

  /** 녹화 모드 여부 (true: 녹화, false: 실시간 캡처). */
  @Column({ name: "record_mode", type: "boolean", default: false })
  public recordMode: boolean;

  /** 참조 페이지 URL (쿼리 파라미터 제외). */
  @Column({ name: "referrer", length: 500, nullable: true })
  public referrer: string;

  /** 이 녹화에 속한 네트워크 요청 목록. */
  @OneToMany(() => NetworkEntity, (network) => network.record, {
    cascade: true,
  })
  public networks: NetworkEntity[];

  /** 이 녹화에 속한 DOM 스냅샷 목록. */
  @OneToMany(() => DomEntity, (dom) => dom.record, { cascade: true })
  public doms: DomEntity[];

  /** 이 녹화에 속한 런타임 콘솔 메시지 목록. */
  @OneToMany(() => RuntimeEntity, (runtime) => runtime.record, {
    cascade: true,
  })
  public runtimes: RuntimeEntity[];

  /** 이 녹화에 속한 화면 캡처 목록. */
  @OneToMany(() => ScreenEntity, (screen) => screen.record, { cascade: true })
  public screens: ScreenEntity[];

  /** 레코드 생성 타임스탬프. */
  @CreateDateColumn({ type: "timestamp" })
  public timestamp: Date;

  /**
   * 이전 코드와의 하위 호환성을 위한 별칭 getter.
   * @returns {Date} 레코드 생성 시각
   */
  public get createdAt(): Date {
    return this.timestamp;
  }
}
