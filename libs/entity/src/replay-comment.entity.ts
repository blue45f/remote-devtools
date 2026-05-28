import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RecordEntity } from './record.entity';

/**
 * 세션 재생 타임라인의 특정 지점에 사용자가 남긴 코멘트.
 *
 * 협업 / triage 용도. 단일 사용자 self-host 환경에서도 가치 있다 — 같은
 * 세션을 며칠 뒤 다시 볼 때 "여기서 결제 실패" 같은 메모가 남아 있다.
 */
@Entity('replay_comment')
@Index(['record', 'createdAt'])
@Index(['orgId', 'createdAt'])
export class ReplayCommentEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 멀티테넌트 격리용 조직 ID (RecordEntity와 동일). */
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  public orgId?: string | null;

  /** 코멘트가 속한 녹화 세션. */
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  public record: RecordEntity;

  /** 재생 시작점 기준 코멘트 위치 (밀리초). 0 이상의 정수. */
  @Column({ name: 'timestamp_ms', type: 'int' })
  public timestampMs: number;

  /** 코멘트 본문. 최대 2000자로 컨트롤러에서 클램프한다. */
  @Column({ type: 'text' })
  public body: string;

  /** 선택적 작성자 표시 이름. NULL은 익명. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  public author: string | null;

  /** triage 워크플로우용 해결 여부. 팀이 처리 완료한 주석을 표시한다. */
  @Column({ type: 'boolean', default: false })
  public resolved: boolean;

  /** 코멘트 작성 시각. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  public createdAt: Date;
}
