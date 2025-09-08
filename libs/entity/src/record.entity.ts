import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { DomEntity } from "./dom.entity";
import { NetworkEntity } from "./network.entity";
import { RuntimeEntity } from "./runtime.entity";
import { ScreenEntity } from "./screen.entity";

/** Represents a single recording session. */
@Entity("record")
export class RecordEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  /** Session name (short label). */
  @Column({ type: "varchar" })
  public name: string;

  /** Session duration in nanoseconds. */
  @Column({ type: "bigint", nullable: true })
  public duration: number;

  /** Page URL captured during this recording. */
  @Column({ type: "text", nullable: true })
  public url?: string;

  /** Unique identifier of the device that produced this recording. */
  @Column({ name: "device_id", nullable: true, length: 255 })
  public deviceId: string;

  /** Whether this session was recorded (true) or captured live (false). */
  @Column({ name: "record_mode", type: "boolean", default: false })
  public recordMode: boolean;

  /** Referring page URL (query parameters excluded). */
  @Column({ name: "referrer", length: 500, nullable: true })
  public referrer: string;

  @OneToMany(() => NetworkEntity, (network) => network.record, {
    cascade: true,
  })
  public networks: NetworkEntity[];

  @OneToMany(() => DomEntity, (dom) => dom.record, { cascade: true })
  public doms: DomEntity[];

  @OneToMany(() => RuntimeEntity, (runtime) => runtime.record, {
    cascade: true,
  })
  public runtimes: RuntimeEntity[];

  @OneToMany(() => ScreenEntity, (screen) => screen.record, { cascade: true })
  public screens: ScreenEntity[];

  @CreateDateColumn({ type: "timestamp" })
  public timestamp: Date;

  /** Alias getter for backward compatibility with older code using createdAt. */
  public get createdAt(): Date {
    return this.timestamp;
  }
}
