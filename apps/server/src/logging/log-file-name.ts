import { LOG_CONFIG } from "./log-config.ts";

/**
 * 方法名：pad
 * 作用：执行该方法负责的单一业务操作。
 * @param value 待处理的值。
 * @param width 方法所需的 width 参数。
 * @returns 本次处理得到的结果。
 */
function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * 方法名：formatLogArchiveFileName
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param timestampMs 方法所需的 timestampMs 参数。
 * @returns 本次处理得到的结果。
 */
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
