import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const REMOTE_COMMANDS = [
  'start',
  'pause',
  'resume',
  'replay',
  'disconnect',
  'collect',
] as const;

export type RemoteCommand = (typeof REMOTE_COMMANDS)[number];

/** Body of POST /api/remote-devtools/sessions/:id/commands. */
export class RemoteCommandDto {
  @ApiProperty({ enum: REMOTE_COMMANDS })
  @IsIn(REMOTE_COMMANDS)
  public command: RemoteCommand;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public value?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  public payload?: Record<string, unknown>;
}
