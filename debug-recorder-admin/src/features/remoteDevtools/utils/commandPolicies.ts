import type { RemoteDevToolsCommand, RemoteDevToolsSession } from "../types";

export type RemoteDevToolsCommandPolicy = {
  command: RemoteDevToolsCommand;
  requiresValue: boolean;
  requiresReconnect?: boolean;
};

export const REMOTE_DEVTOOLS_COMMAND_POLICIES: Record<
  RemoteDevToolsCommand,
  RemoteDevToolsCommandPolicy
> = {
  start: {
    command: "start",
    requiresValue: false,
  },
  pause: {
    command: "pause",
    requiresValue: false,
    requiresReconnect: false,
  },
  resume: {
    command: "resume",
    requiresValue: false,
  },
  replay: {
    command: "replay",
    requiresValue: true,
  },
  disconnect: {
    command: "disconnect",
    requiresValue: false,
    requiresReconnect: false,
  },
  collect: {
    command: "collect",
    requiresValue: true,
  },
};

const COMMANDS_BY_SESSION_STATUS: Record<
  RemoteDevToolsSession["status"],
  RemoteDevToolsCommand[]
> = {
  idle: ["start", "collect", "disconnect"],
  waiting: ["resume", "replay", "collect", "disconnect"],
  connected: ["pause", "replay", "collect", "disconnect"],
  running: ["pause", "replay", "collect", "disconnect"],
  stopped: ["start", "collect", "disconnect"],
  error: ["start", "collect", "disconnect"],
};

export const getRemoteDevToolsCommandsForStatus = (
  status: RemoteDevToolsSession["status"],
): RemoteDevToolsCommand[] =>
  COMMANDS_BY_SESSION_STATUS[status] ?? ["start", "collect", "disconnect"];

export const isRemoteDevToolsCommandAllowed = (
  status: RemoteDevToolsSession["status"],
  command: RemoteDevToolsCommand,
): boolean => getRemoteDevToolsCommandsForStatus(status).includes(command);

export const doesRemoteDevToolsCommandRequireValue = (
  command: RemoteDevToolsCommand,
): boolean => REMOTE_DEVTOOLS_COMMAND_POLICIES[command].requiresValue;

export const REMOTE_DEVTOOLS_COMMAND_LABELS: Record<
  RemoteDevToolsCommand,
  string
> = {
  start: "시작",
  pause: "중단",
  resume: "재개",
  replay: "재생",
  disconnect: "세션 종료",
  collect: "수집",
};
