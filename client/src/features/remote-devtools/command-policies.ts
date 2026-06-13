import type { RemoteCommand, RemoteSessionStatus } from './types';

interface CommandPolicy {
  command: RemoteCommand;
  requiresValue: boolean;
}

export const COMMAND_POLICIES: Record<RemoteCommand, CommandPolicy> = {
  start: { command: 'start', requiresValue: false },
  pause: { command: 'pause', requiresValue: false },
  resume: { command: 'resume', requiresValue: false },
  replay: { command: 'replay', requiresValue: true },
  disconnect: { command: 'disconnect', requiresValue: false },
  collect: { command: 'collect', requiresValue: true },
};

/** Which commands are offered for a given session status. */
export const COMMANDS_BY_STATUS: Record<RemoteSessionStatus, RemoteCommand[]> = {
  idle: ['start', 'collect', 'disconnect'],
  waiting: ['resume', 'replay', 'collect', 'disconnect'],
  connected: ['pause', 'replay', 'collect', 'disconnect'],
  running: ['pause', 'replay', 'collect', 'disconnect'],
  stopped: ['start', 'collect', 'disconnect'],
  error: ['start', 'collect', 'disconnect'],
};

export function commandsForStatus(status: RemoteSessionStatus): RemoteCommand[] {
  return COMMANDS_BY_STATUS[status] ?? [];
}

export function commandRequiresValue(command: RemoteCommand): boolean {
  return COMMAND_POLICIES[command]?.requiresValue ?? false;
}

/** i18n key for a command label. */
export function commandLabelKey(command: RemoteCommand): string {
  const map: Record<RemoteCommand, string> = {
    start: 'remotedevtools.cmdStart',
    pause: 'remotedevtools.cmdPause',
    resume: 'remotedevtools.cmdResume',
    replay: 'remotedevtools.cmdReplay',
    disconnect: 'remotedevtools.cmdDisconnect',
    collect: 'remotedevtools.cmdCollect',
  };
  return map[command];
}
