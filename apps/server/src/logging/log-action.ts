import { LOG_ACTIONS } from "./log-config.ts";

export type LogAction = (typeof LOG_ACTIONS)[number];

export function isLogAction(value: string): value is LogAction {
  return LOG_ACTIONS.some((action) => action === value);
}
