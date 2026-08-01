import { LOG_LEVELS } from "./log-config.ts";

export type LogLevel = (typeof LOG_LEVELS)[number];

export function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.some((level) => level === value);
}
