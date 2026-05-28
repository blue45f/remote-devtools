import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DomEntity } from './dom.entity';
import { NetworkEntity } from './network.entity';
import { RuntimeEntity } from './runtime.entity';
import { ScreenEntity } from './screen.entity';

/** 녹화 세션 하나를 나타내는 엔티티. */
@Entity('record')
@Index(['deviceId', 'timestamp'])
@Index(['timestamp'])
@Index(['orgId', 'timestamp'])
export class RecordEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * 멀티테넌트 격리용 조직 ID. NULL은 self-host 단일 테넌트.
   *
   * SaaS launch path (docs/LAUNCH.md Phase 1)에서는 모든 행에 NOT NULL로
   * 백필 후 NOT NULL 제약 추가. 현재는 nullable이라 기존 데이터 호환.
   */
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  public orgId?: string | null;

  /** 세션 이름 (짧은 라벨). */
  @Column({ type: 'varchar' })
  public name: string;

  /** 세션 지속 시간 (나노초 단위). */
  @Column({ type: 'bigint', nullable: true })
  public duration: string | number;

  /** 녹화 중 캡처된 페이지 URL. */
  @Column({ type: 'text', nullable: true })
  public url?: string;

  /** 이 녹화를 생성한 디바이스의 고유 식별자. */
  @Column({ name: 'device_id', nullable: true, length: 255 })
  public deviceId: string;

  /** 녹화 모드 여부 (true: 녹화, false: 실시간 캡처). */
  @Column({ name: 'record_mode', type: 'boolean', default: false })
  public recordMode: boolean;

  /** 참조 페이지 URL (쿼리 파라미터 제외). */
  @Column({ name: 'referrer', length: 500, nullable: true })
  public referrer: string;

  /**
   * SDK 캡처 시 클라이언트의 navigator.userAgent. NULL은 (a) 마이그레이션 이전
   * 데이터 또는 (b) SDK가 UA를 보내지 않은 케이스. 프론트엔드에서 브라우저/OS
   * 배지 렌더링용으로만 사용한다.
   */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  public userAgent?: string | null;

  /**
   * 사용자가 세션에 붙인 자유 형식 태그 목록. 단일 사용자 편집 모델이라
   * Postgres text[]로 충분하다. 검색/필터 빈도가 늘면 GIN 인덱스를 추가하고
   * tag dictionary 테이블로 정규화한다.
   */
  @Column({
    name: 'tags',
    type: 'text',
    array: true,
    nullable: false,
    default: () => "'{}'::text[]",
  })
  public tags: string[];

  /**
   * 사용자가 세션에 남기는 자유 형식 메모. 태그가 짧은 라벨이라면 note는
   * 재현 절차·맥락 같은 긴 설명용. 단일 사용자 편집 모델이라 단일 text
   * 컬럼으로 충분하다.
   */
  @Column({ name: 'note', type: 'text', nullable: true })
  public note?: string | null;

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
  @CreateDateColumn({ type: 'timestamp' })
  public timestamp: Date;

  /**
   * 이전 코드와의 하위 호환성을 위한 별칭 getter.
   * @returns {Date} 레코드 생성 시각
   */
  public get createdAt(): Date {
    return this.timestamp;
  }
}
