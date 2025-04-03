import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Record } from "./record.entity";

@Entity()
@Unique(["record", "type"])
export class Screen {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: "text", nullable: true, default: null })
  public type: "screenPreview" | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  public event_type:
    | "full_snapshot"
    | "incremental_snapshot"
    | "user_interaction"
    | "viewport_change"
    | "session_start"
    | "session_end"
    | null;

  @Column({ type: "jsonb" })
  public protocol: object;

  @Column({
    type: "bigint",
    transformer: {
      to: (value: any) => value,
      from: (value: string) => value, // bigint를 문자열로 반환
    },
  })
  public timestamp: string | number; // DB에서는 문자열로, 앱에서는 둘 다 처리

  @Column({ type: "integer", nullable: true })
  public sequence: number | null;

  // 스크린은 하나의 Record와 연결됨
  @ManyToOne(() => Record, (record) => record.screen, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recordId" })
  public record: Record;
}
