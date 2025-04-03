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

// 담당자 정보 타입
export interface AssigneeInfo {
  displayName: string; // 홍영준
  username?: string; // dd (어드민에서 알아내서 저장)
  email?: string; // user@example.com (선택적)
}

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
      'JSON 배열: [{"displayName":"John Doe","username":"johndoe","email":"john@example.com"}]',
  })
  assigneeInfoList?: AssigneeInfo[];

  @Column({
    name: "component_list",
    type: "json",
    nullable: true,
    comment: 'JSON 배열: ["인수테스트", "통합테스트", "릴리즈테스트"]',
  })
  componentList?: string[];

  @Column({
    name: "label_list",
    type: "json",
    nullable: true,
    comment: 'JSON 배열: ["비마트주문", "푸드주문"]',
  })
  labelList?: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => UserEntity, (user) => user.ticketTemplateList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
