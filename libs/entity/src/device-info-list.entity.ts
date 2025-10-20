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

/** API 레이어에서 사용하는 디바이스 정보 페이로드. */
export interface DeviceInfo {
  /** 사용자가 지정한 디바이스 별칭 (선택). */
  name?: string;
  /** 하드웨어 디바이스 고유 식별자. */
  deviceId: string;
}

/** 사용자에 연결된 디바이스 정보 엔티티. */
@Entity("device_info_list")
@Index(["deviceId"], { unique: true })
@Index(["userId"])
export class DeviceInfoEntity {
  /** 자동 생성되는 기본 키. */
  @PrimaryGeneratedColumn()
  id: number;

  /** 디바이스를 소유한 사용자의 ID (외래 키). */
  @Column({ name: "user_id" })
  userId: number;

  /** 디바이스 고유 식별자. */
  @Column({ name: "device_id", length: 100, unique: true })
  deviceId: string;

  /** 사용자가 지정한 디바이스 별칭 (선택). */
  @Column({ name: "device_name", length: 100, nullable: true })
  name?: string;

  /** 디바이스 정보 생성 일시. */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** 디바이스 정보 최종 수정 일시. */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  /** 이 디바이스를 소유한 사용자. */
  @ManyToOne(() => UserEntity, (user) => user.deviceInfoList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
