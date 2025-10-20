import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { TicketLogEntity } from "./ticket-log.entity";

/** 티켓 로그에 연결된 라벨. */
@Entity("ticket_labels")
@Index(["labelName"]) // 라벨별 통계 조회 최적화
@Index(["ticketLogId", "labelName"], { unique: true }) // 중복 방지 및 티켓별 라벨 조회 최적화
export class TicketLabelEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 연관된 티켓 로그의 ID (외래 키). */
  @Column({ name: "ticket_log_id", type: "int" })
  public ticketLogId: number;

  /** 라벨 이름. */
  @Column({ name: "label_name", length: 100 })
  public labelName: string;

  /** 이 라벨이 속한 티켓 로그. */
  @ManyToOne(() => TicketLogEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_log_id" })
  public ticketLog: TicketLogEntity;
}
