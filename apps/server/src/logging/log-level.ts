export const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.some((level) => level === value);
}
