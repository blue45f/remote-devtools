import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
export const remoteCommandSchema = z
  .object({
    command: z.enum(REMOTE_COMMANDS),
    value: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export class RemoteCommandDto extends createZodDto(remoteCommandSchema) {}
