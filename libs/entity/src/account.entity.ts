import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrganizationMemberEntity } from './organization-member.entity';

export type AccountStatus = 'active' | 'suspended' | 'deleted';

@Entity('accounts')
@Index(['email'], { unique: true })
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', length: 320 })
  public email: string;

  @Column({ type: 'varchar', length: 120 })
  public name: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  public passwordHash?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  public status: AccountStatus;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  public lastLoginAt?: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  public deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(() => OrganizationMemberEntity, (member) => member.account)
  public memberships: OrganizationMemberEntity[];
}
