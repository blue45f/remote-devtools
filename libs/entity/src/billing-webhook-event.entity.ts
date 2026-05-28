import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('billing_webhook_events')
@Unique('UQ_billing_webhook_events_provider_event', ['provider', 'providerEventId'])
export class BillingWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', length: 32 })
  public provider: string;

  @Column({ name: 'provider_event_id', type: 'varchar', length: 255 })
  public providerEventId: string;

  @Column({ name: 'provider_event_type', type: 'varchar', length: 128 })
  public providerEventType: string;

  @CreateDateColumn({ name: 'received_at' })
  public receivedAt: Date;
}
