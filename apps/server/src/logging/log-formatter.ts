import { LOG_CONFIG } from "./log-config.ts";
import type { LogRecord } from "./log-record.ts";
import { formatLogTarget } from "./target-formatter.ts";

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function assertSingleLineField(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${fieldName} cannot be empty.`);
  }
  if (/[[\]\r\n]/u.test(value)) {
    throw new TypeError(`${fieldName} cannot contain brackets or line breaks.`);
  }
}

export function formatLogTimestamp(timestampMs: number): string {
  if (!Number.isSafeInteger(timestampMs)) {
    throw new RangeError("Log timestamp must be a safe integer in milliseconds.");
  }

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Log timestamp is outside the supported date range.");
  }

  return [
    pad(date.getFullYear(), 4),
    "-",
    pad(date.getMonth() + 1, 2),
    "-",
    pad(date.getDate(), 2),
    " ",
    pad(date.getHours(), 2),
    ":",
    pad(date.getMinutes(), 2),
    ":",
    pad(date.getSeconds(), 2),
    ".",
    pad(date.getMilliseconds(), 3),
  ].join("");
}

export function formatLogRecord(record: LogRecord): string {
  assertSingleLineField(record.module, "Log module");
  assertSingleLineField(record.message, "Log message");

  return (
    `[${formatLogTimestamp(record.timestampMs)}]` +
    `[${record.level.padEnd(LOG_CONFIG.levelWidth, " ")}]` +
    `[${formatLogTarget(record.target)}]` +
    `[${record.action.padEnd(LOG_CONFIG.actionWidth, " ")}]` +
    `[${record.module}] ${record.message}`
  );
}
