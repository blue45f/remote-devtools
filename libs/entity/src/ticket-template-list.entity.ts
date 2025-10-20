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

/** 티켓 템플릿에 포함되는 담당자 정보. */
export interface AssigneeInfo {
  /** 담당자 표시 이름. */
  displayName: string;
  /** 시스템 사용자명 (관리자 기반 매핑). */
  username?: string;
  /** 이메일 주소 (선택). */
  email?: string;
}

/** 사용자가 정의한 티켓 템플릿 (사전 입력 기본값 포함). */
@Entity("ticket_template_list")
@Index(["userId"])
@Index(["name"])
export class UserTicketTemplateEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  id: number;

  /** 템플릿을 소유한 사용자의 ID (외래 키). */
  @Column({ name: "user_id" })
  userId: number;

  /** 템플릿 이름. */
  @Column({ name: "name", length: 100 })
  name: string;

  /** 테스트 케이스 시트 링크. */
  @Column({ name: "tc_sheet_link", length: 200, nullable: true })
  tcSheetLink?: string;

  /** JIRA 프로젝트 키. */
  @Column({ name: "jira_project_key", length: 50, nullable: true })
  jiraProjectKey?: string;

  /** 에픽 티켓 번호. */
  @Column({ name: "epic_ticket", length: 50, nullable: true })
  epicTicket?: string;

  /** 티켓 제목 접두사. */
  @Column({ name: "title_prefix", length: 100, nullable: true })
  titlePrefix?: string;

  /** 담당자 정보 목록 (JSON 배열). */
  @Column({
    name: "assignee_info_list",
    type: "json",
    nullable: true,
    comment:
      'JSON array: [{"displayName":"John Doe","username":"johndoe","email":"john@example.com"}]',
  })
  assigneeInfoList?: AssigneeInfo[];

  /** 컴포넌트 이름 목록 (JSON 배열). */
  @Column({
    name: "component_list",
    type: "json",
    nullable: true,
    comment: 'JSON array: ["AcceptanceTest", "IntegrationTest", "ReleaseTest"]',
  })
  componentList?: string[];

  /** 라벨 이름 목록 (JSON 배열). */
  @Column({
    name: "label_list",
    type: "json",
    nullable: true,
    comment: 'JSON array: ["BmartOrder", "FoodOrder"]',
  })
  labelList?: string[];

  /** 템플릿 생성 일시. */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** 템플릿 최종 수정 일시. */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  /** 이 템플릿을 소유한 사용자. */
  @ManyToOne(() => UserEntity, (user) => user.ticketTemplateList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
