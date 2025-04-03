import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Dom } from "./dom.entity";
import { Network } from "./network.entity";
import { Runtime } from "./runtime.entity";
import { Screen } from "./screen.entity";

@Entity()
export class Record {
  @PrimaryGeneratedColumn()
  public id: number;

  // 녹화 세션 명칭 - 30자 이내 (임시)
  @Column({ type: "varchar" })
  public name: string;

  // 세션 지속 시간 (나노초)
  @Column({ type: "bigint", nullable: true })
  public duration: number;

  // 디바이스 ID

  // 기록된 페이지 URL
  @Column({ type: "text", nullable: true })
  public url?: string;

  @Column({ name: "device_id", nullable: true, length: 255 })
  public deviceId: string;

  // 녹화 모드 여부 (true: 녹화 모드, false: 라이브 모드)
  @Column({ name: "record_mode", type: "boolean", default: false })
  public recordMode: boolean;

  // 접속 페이지 URL (쿼리 파라미터 제외)
  @Column({ name: "referrer", length: 500, nullable: true })
  public referrer: string;

  @OneToMany(() => Network, (network) => network.record, { cascade: true })
  public networks: Network[];

  @OneToMany(() => Dom, (dom) => dom.record, { cascade: true })
  public doms: Dom[];

  @OneToMany(() => Runtime, (runtime) => runtime.record, { cascade: true })
  public runtimes: Runtime[];

  @OneToMany(() => Screen, (screen) => screen.record, { cascade: true })
  public screen: Runtime[];

  @CreateDateColumn({ type: "timestamp" })
  public timestamp: Date;

  // createdAt 호환성을 위한 getter
  public get createdAt(): Date {
    return this.timestamp;
  }
}
