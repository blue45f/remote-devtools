import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordEntity, RuntimeEntity } from '@remote-platform/entity';

import { AuthModule } from '../auth/auth.module';

import { RemoteDevToolsController } from './remote-devtools.controller';
import { RemoteDevToolsService } from './remote-devtools.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity, RuntimeEntity]), AuthModule],
  controllers: [RemoteDevToolsController],
  providers: [RemoteDevToolsService],
  exports: [RemoteDevToolsService],
})
export class RemoteDevToolsModule {}
