import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordEntity, ReplayCommentEntity, TicketLogEntity } from '@remote-platform/entity';

import { AuthModule } from '../auth/auth.module';

import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  // AuthModule provides AuthService for the `@UseGuards(AuthGuard)` on
  // ActivityController — without it Nest can't resolve the guard at boot.
  imports: [
    TypeOrmModule.forFeature([RecordEntity, TicketLogEntity, ReplayCommentEntity]),
    AuthModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
