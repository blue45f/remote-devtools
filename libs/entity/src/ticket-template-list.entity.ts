import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { UserEntity } from "./user.entity";

/** Assignee information embedded in a ticket template. */
export interface AssigneeInfo {
  /** Full display name of the assignee. */
  displayName: string;
  /** System username (resolved via admin). */
  username?: string;
  /** Email address (optional). */
  email?: string;
}

/** User-defined ticket template with pre-filled defaults. */
@Entity("ticket_template_list")
@Index(["userId"])
@Index(["name"])
export class UserTicketTemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "name", length: 100 })
  name: string;

  @Column({ name: "tc_sheet_link", length: 200, nullable: true })
  tcSheetLink?: string;

  @Column({ name: "jira_project_key", length: 50, nullable: true })
  jiraProjectKey?: string;

  @Column({ name: "epic_ticket", length: 50, nullable: true })
  epicTicket?: string;

  @Column({ name: "title_prefix", length: 100, nullable: true })
  titlePrefix?: string;

  @Column({
    name: "assignee_info_list",
    type: "json",
    nullable: true,
    comment:
      'JSON array: [{"displayName":"John Doe","username":"johndoe","email":"john@example.com"}]',
  })
  assigneeInfoList?: AssigneeInfo[];

  @Column({
    name: "component_list",
    type: "json",
    nullable: true,
    comment: 'JSON array: ["AcceptanceTest", "IntegrationTest", "ReleaseTest"]',
  })
  componentList?: string[];

  @Column({
    name: "label_list",
    type: "json",
    nullable: true,
    comment: 'JSON array: ["BmartOrder", "FoodOrder"]',
  })
  labelList?: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.ticketTemplateList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
