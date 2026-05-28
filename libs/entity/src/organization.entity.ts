import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tenant boundary for multi-tenant deployments.
 *
 * NOTE: This entity is **scaffolding** for the SaaS launch path documented
 * in `docs/LAUNCH.md`. It is intentionally NOT yet wired into other
 * entities or query scopes — adopting it requires a coordinated migration
 * (see Phase 1 of LAUNCH.md). For self-hosted single-tenant deployments
 * the table can stay empty.
 */
export type OrganizationPlan = 'free' | 'starter' | 'pro';
export type OrganizationSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

@Entity('organizations')
@Index(['slug'], { unique: true })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  /** URL-friendly stable identifier — e.g. used in subdomain routing. */
  @Column({ type: 'varchar', length: 64 })
  public slug: string;

  /** Human-readable display name. */
  @Column({ type: 'varchar', length: 200 })
  public name: string;

  /** Subscription tier. Free is the default for new sign-ups. */
  @Column({
    type: 'varchar',
    length: 32,
    default: 'free',
  })
  public plan: OrganizationPlan;

  /** Billing-side identifier when Stripe is connected. */
  @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true })
  public stripeCustomerId?: string | null;

  /** Billing provider that owns the subscription state. */
  @Column({
    name: 'billing_provider',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  public billingProvider?: string | null;

  /** Provider-side subscription identifier. */
  @Column({
    name: 'billing_subscription_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  public billingSubscriptionId?: string | null;

  /** Last normalized provider subscription status. */
  @Column({
    name: 'subscription_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  public subscriptionStatus?: OrganizationSubscriptionStatus | null;

  /** End of the current paid period, when supplied by the provider. */
  @Column({
    name: 'subscription_current_period_end',
    type: 'timestamp',
    nullable: true,
  })
  public subscriptionCurrentPeriodEnd?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}
