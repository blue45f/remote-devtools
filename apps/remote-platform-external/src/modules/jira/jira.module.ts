import { Module } from "@nestjs/common";

import { SlackModule } from "../slack/slack.module";
import { UserInfoModule } from "../user-info/user-info.module";

import { JiraController } from "./jira.controller";
import { JiraService } from "./jira.service";

@Module({
  imports: [SlackModule, UserInfoModule],
  controllers: [JiraController],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}
