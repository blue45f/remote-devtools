import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountEntity } from './account.entity';
import { OrganizationEntity } from './organization.entity';

export type OrganizationMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type OrganizationMemberStatus = 'active' | 'invited' | 'suspended' | 'deleted';

@Entity('organization_members')
@Index(['orgId', 'accountId'], { unique: true })
@Index(['accountId'])
@Index(['orgId', 'role', 'status'])
export class OrganizationMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  public orgId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  public accountId: string;

  @Column({ type: 'varchar', length: 32, default: 'member' })
  public role: OrganizationMemberRole;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  public status: OrganizationMemberStatus;

  @Column({ name: 'invited_at', type: 'timestamp', nullable: true })
  public invitedAt?: Date | null;

  @Column({ name: 'joined_at', type: 'timestamp', nullable: true })
  public joinedAt?: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  public deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @ManyToOne(() => AccountEntity, (account) => account.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  public account: AccountEntity;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  public organization: OrganizationEntity;
}
