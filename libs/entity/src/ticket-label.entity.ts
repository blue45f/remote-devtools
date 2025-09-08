import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { TicketLogEntity } from "./ticket-log.entity";

/** Label associated with a ticket log entry. */
@Entity("ticket_labels")
@Index(["labelName"]) // Optimizes per-label statistics queries
@Index(["ticketLogId", "labelName"], { unique: true }) // Prevents duplicates and optimizes per-ticket label lookups
export class TicketLabelEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: "ticket_log_id", type: "int" })
  public ticketLogId: number;

  @Column({ name: "label_name", length: 100 })
  public labelName: string;

  @ManyToOne(() => TicketLogEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_log_id" })
  public ticketLog: TicketLogEntity;
}
