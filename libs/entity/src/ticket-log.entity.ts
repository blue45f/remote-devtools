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

/** 티켓 생성 이벤트 로그 (메타데이터 및 컴포넌트/라벨 관계 포함). */
@Entity("ticket_logs")
@Index(["deviceId", "createdAt"]) // 디바이스별 티켓 이력 조회 최적화
@Index(["createdAt"]) // 기간별 조회 최적화
@Index(["orgId", "createdAt"]) // 멀티테넌트 격리 + 시간순 조회
export class TicketLogEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  public id: number;

  /** 멀티테넌트 격리용 조직 ID. NULL은 self-host 단일 테넌트. */
  @Column({ name: "org_id", type: "uuid", nullable: true })
  public orgId?: string | null;

  /** 티켓을 생성한 디바이스의 고유 식별자. */
  @Column({ name: "device_id", length: 255 })
  public deviceId: string;

  /** 티켓 생성자의 시스템 사용자명. */
  @Column({ name: "username", length: 255 })
  public username: string;

  /** 티켓 생성자의 표시 이름. */
  @Column({ name: "user_display_name", length: 255 })
  public userDisplayName: string;

  /** 연관된 녹화 세션의 ID. */
  @Column({ name: "record_id", type: "int" })
  public recordId: number;

  /** 생성된 JIRA 티켓의 URL. */
  @Column({ name: "ticket_url", length: 1000 })
  public ticketUrl: string;

  /** JIRA 프로젝트 키. */
  @Column({ name: "jira_project_key", length: 100 })
  public jiraProjectKey: string;

  /** 티켓 담당자 이름. */
  @Column({ name: "assignee", length: 255 })
  public assignee: string;

  /** 상위 에픽 티켓 번호 (선택). */
  @Column({ name: "parent_epic", length: 255, nullable: true })
  public parentEpic?: string;

  /** 티켓 제목 (선택). */
  @Column({ name: "title", length: 500, nullable: true })
  public title?: string;

  /** 녹화 세션 이름 (선택). */
  @Column({ name: "room_name", length: 255, nullable: true })
  public sessionName?: string;

  /** 티켓과 연관된 페이지 URL. */
  @Column({ name: "url", length: 1000 })
  public url: string;

  /** 이 티켓에 연결된 컴포넌트 목록. */
  @OneToMany(() => TicketComponentEntity, (component) => component.ticketLog, {
    cascade: true,
  })
  public components: TicketComponentEntity[];

  /** 이 티켓에 연결된 라벨 목록. */
  @OneToMany(() => TicketLabelEntity, (label) => label.ticketLog, {
    cascade: true,
  })
  public labels: TicketLabelEntity[];

  /** 티켓 생성 일시. */
  @CreateDateColumn({ name: "created_at" })
  public createdAt: Date;
}
