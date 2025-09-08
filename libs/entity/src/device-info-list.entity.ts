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

/** Device information payload used by the API layer. */
export interface DeviceInfo {
  /** Optional user-assigned device label. */
  name?: string;
  /** Unique hardware device identifier. */
  deviceId: string;
}

/** Persisted device information linked to a user. */
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

  /** Optional user-assigned device label. */
  @Column({ name: "device_name", length: 100, nullable: true })
  name?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.deviceInfoList, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
