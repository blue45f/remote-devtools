/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Module } from "@nestjs/common";

import { WorkflowController } from "./workflow.controller";

@Module({
  imports: [],
  controllers: [WorkflowController],
  providers: [],
  exports: [],
})
export class WorkflowModule {}
