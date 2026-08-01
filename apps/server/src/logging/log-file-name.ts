import { LOG_CONFIG } from "./log-config.ts";

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function formatLogArchiveFileName(timestampMs: number): string {
  if (!Number.isSafeInteger(timestampMs)) {
    throw new RangeError("Log archive timestamp must be a safe integer in milliseconds.");
  }

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Log archive timestamp is outside the supported date range.");
  }

  const timestamp = [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1, 2),
    pad(date.getDate(), 2),
    "_",
    pad(date.getHours(), 2),
    pad(date.getMinutes(), 2),
    pad(date.getSeconds(), 2),
    "_",
    pad(date.getMilliseconds(), 3),
  ].join("");

  return `${LOG_CONFIG.filePrefix}_${timestamp}${LOG_CONFIG.fileExtension}`;
}
