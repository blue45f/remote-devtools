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

// 디바이스 정보 타입 (API 전송용)
export interface DeviceInfo {
  name?: string; // 사용자 지정 이름 (예: "아이폰", "회사 맥북")
  deviceId: string; // 실제 디바이스 ID
}

@Entity("device_info_list")
@Index(["deviceId"], { unique: true })
@Index(["userId"])
export class DeviceInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "device_id", length: 100, unique: true })
  deviceId: string;

  @Column({ name: "device_name", length: 100, nullable: true })
  name?: string; // 사용자가 지정하는 디바이스 이름 (예: "아이폰", "회사 맥북")

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => UserEntity, (user) => user.deviceInfoList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
