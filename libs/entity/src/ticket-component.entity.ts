import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { TicketLogEntity } from "./ticket-log.entity";

@Entity("ticket_components")
@Index(["componentName"]) // 컴포넌트별 통계 조회 최적화
@Index(["ticketLogId", "componentName"], { unique: true }) // 중복 방지 및 티켓별 컴포넌트 조회 최적화
export class TicketComponentEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: "ticket_log_id", type: "int" })
  public ticketLogId: number;

  @Column({ name: "component_name", length: 100 }) // 길이 제한으로 효율성 증대
  public componentName: string;

  @ManyToOne(() => TicketLogEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_log_id" })
  public ticketLog: TicketLogEntity;
}
