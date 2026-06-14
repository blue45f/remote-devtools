import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DomEntity,
  NetworkEntity,
  RecordEntity,
  ReplayCommentEntity,
  RuntimeEntity,
  ScreenEntity,
} from '@remote-platform/entity';

import { DomService } from './dom.service';
import { ImageBase64Service } from './image-base64.service';
import { NetworkService } from './network.service';
import { RecordService } from './record.service';
import { ReplayCommentService } from './replay-comment.service';
import { RuntimeService } from './runtime.service';
import { ScreenService } from './screen.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordEntity,
      NetworkEntity,
      ReplayCommentEntity,
      DomEntity,
      RuntimeEntity,
      ScreenEntity,
    ]),
  ],
  providers: [
    RecordService,
    NetworkService,
    ReplayCommentService,
    DomService,
    RuntimeService,
    ScreenService,
    ImageBase64Service,
  ],
  exports: [
    RecordService,
    NetworkService,
    ReplayCommentService,
    DomService,
    RuntimeService,
    ScreenService,
    ImageBase64Service,
    TypeOrmModule,
  ],
})
export class ServicesModule {}
