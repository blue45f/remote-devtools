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

/** 사용자 직군 유형. */
export enum JobType {
  /** 품질 보증 (Quality Assurance). */
  QA = "QA",
  /** 프로덕트 매니저 (Product Manager). */
  PM = "PM",
  /** 프로덕트 디자이너 (Product Designer). */
  PD = "PD",
  /** 개발자 (Developer). */
  DEV = "DEV",
  /** 기타 직군. */
  OTHER = "OTHER",
}

/** Slack ID와 사번으로 식별되는 애플리케이션 사용자. */
@Entity("users")
@Index(["slackId"], { unique: true })
@Index(["empNo"], { unique: true })
@Index(["orgId"])
export class UserEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  id: number;

  /** 멀티테넌트 격리용 조직 ID. NULL은 self-host 단일 테넌트. */
  @Column({ name: "org_id", type: "uuid", nullable: true })
  orgId?: string | null;

  /** 사용자 표시 이름. */
  @Column({ length: 100 })
  name: string;

  /** JIRA 담당자 매핑에 사용되는 시스템 사용자명. */
  @Column({ length: 50, nullable: true })
  username?: string;

  /** 사용자의 직군 유형. */
  @Column({
    type: "enum",
    enum: JobType,
    name: "job_type",
  })
  jobType: JobType;

  /** Slack 고유 사용자 ID. */
  @Column({ name: "slack_id", length: 50, unique: true })
  slackId: string;

  /** 사번 (조직 내 고유 식별자). */
  @Column({ name: "emp_no", length: 20, unique: true })
  empNo: string;

  /** 마지막으로 선택한 티켓 템플릿 이름. */
  @Column({ name: "last_selected_template_name", nullable: true })
  lastSelectedTemplateName?: string;

  /** 사용자 생성 일시. */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** 사용자 정보 최종 수정 일시. */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  /** 사용자가 등록한 디바이스 정보 목록. */
  @OneToMany(() => DeviceInfoEntity, (deviceInfo) => deviceInfo.user, {
    cascade: true,
  })
  deviceInfoList: DeviceInfoEntity[];

  /** 사용자가 생성한 티켓 템플릿 목록. */
  @OneToMany(() => UserTicketTemplateEntity, (template) => template.user, {
    cascade: true,
  })
  ticketTemplateList: UserTicketTemplateEntity[];
}
