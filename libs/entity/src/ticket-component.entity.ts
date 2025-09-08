import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { TicketLogEntity } from "./ticket-log.entity";

/** Component associated with a ticket log entry. */
@Entity("ticket_components")
@Index(["componentName"]) // Optimizes per-component statistics queries
@Index(["ticketLogId", "componentName"], { unique: true }) // Prevents duplicates and optimizes per-ticket component lookups
export class TicketComponentEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: "ticket_log_id", type: "int" })
  public ticketLogId: number;

  @Column({ name: "component_name", length: 100 })
  public componentName: string;

  @ManyToOne(() => TicketLogEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_log_id" })
  public ticketLog: TicketLogEntity;
}
