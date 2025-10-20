import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { TicketLogEntity } from "./ticket-log.entity";

/** 티켓 로그에 연결된 컴포넌트. */
@Entity("ticket_components")
@Index(["componentName"]) // 컴포넌트별 통계 조회 최적화
@Index(["ticketLogId", "componentName"], { unique: true }) // 중복 방지 및 티켓별 컴포넌트 조회 최적화
export class TicketComponentEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 연관된 티켓 로그의 ID (외래 키). */
  @Column({ name: "ticket_log_id", type: "int" })
  public ticketLogId: number;

  /** 컴포넌트 이름. */
  @Column({ name: "component_name", length: 100 })
  public componentName: string;

  /** 이 컴포넌트가 속한 티켓 로그. */
  @ManyToOne(() => TicketLogEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_log_id" })
  public ticketLog: TicketLogEntity;
}
