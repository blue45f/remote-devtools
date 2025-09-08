import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from "typeorm";

import { TicketComponentEntity } from "./ticket-component.entity";
import { TicketLabelEntity } from "./ticket-label.entity";

/** Log of ticket creation events, including metadata and relationships to components/labels. */
@Entity("ticket_logs")
@Index(["deviceId", "createdAt"]) // Optimizes per-device ticket history queries
@Index(["createdAt"]) // Optimizes time-range queries
export class TicketLogEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: "device_id", length: 255 })
  public deviceId: string;

  @Column({ name: "username", length: 255 })
  public username: string;

  @Column({ name: "user_display_name", length: 255 })
  public userDisplayName: string;

  @Column({ name: "record_id", type: "int" })
  public recordId: number;

  @Column({ name: "ticket_url", length: 1000 })
  public ticketUrl: string;

  @Column({ name: "jira_project_key", length: 100 })
  public jiraProjectKey: string;

  @Column({ name: "assignee", length: 255 })
  public assignee: string;

  @Column({ name: "parent_epic", length: 255, nullable: true })
  public parentEpic?: string;

  @Column({ name: "title", length: 500, nullable: true })
  public title?: string;

  @Column({ name: "room_name", length: 255, nullable: true })
  public roomName?: string;

  @Column({ name: "url", length: 1000 })
  public url: string;

  @OneToMany(() => TicketComponentEntity, (component) => component.ticketLog, {
    cascade: true,
  })
  public components: TicketComponentEntity[];

  @OneToMany(() => TicketLabelEntity, (label) => label.ticketLog, {
    cascade: true,
  })
  public labels: TicketLabelEntity[];

  @CreateDateColumn({ name: "created_at" })
  public createdAt: Date;
}
