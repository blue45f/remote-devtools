import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";

import { DeviceInfoEntity } from "./device-info-list.entity";
import { UserTicketTemplateEntity } from "./ticket-template-list.entity";

export enum JobType {
  QA = "QA", // Quality Assurance
  PM = "PM", // Product Manager
  PD = "PD", // Product Designer
  DEV = "DEV", // Developer
  OTHER = "OTHER",
}

/** Application user, identified by Slack ID and employee number. */
@Entity("users")
@Index(["slackId"], { unique: true })
@Index(["empNo"], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Full display name. */
  @Column({ length: 100 })
  name: string;

  /** System username used for JIRA reporter/assignee resolution. */
  @Column({ length: 50, nullable: true })
  username?: string;

  @Column({
    type: "enum",
    enum: JobType,
    name: "job_type",
  })
  jobType: JobType;

  @Column({ name: "slack_id", length: 50, unique: true })
  slackId: string;

  /** Employee number (unique identifier within the organization). */
  @Column({ name: "emp_no", length: 20, unique: true })
  empNo: string;

  @Column({ name: "last_selected_template_name", nullable: true })
  lastSelectedTemplateName?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => DeviceInfoEntity, (deviceInfo) => deviceInfo.user, {
    cascade: true,
  })
  deviceInfoList: DeviceInfoEntity[];

  @OneToMany(() => UserTicketTemplateEntity, (template) => template.user, {
    cascade: true,
  })
  ticketTemplateList: UserTicketTemplateEntity[];
}
