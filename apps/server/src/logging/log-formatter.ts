import { LOG_CONFIG } from "./log-config.ts";
import type { LogRecord } from "./log-record.ts";
import { formatLogTarget } from "./target-formatter.ts";

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
 * 方法名：assertSingleLineField
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param fieldName 方法所需的 fieldName 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertSingleLineField(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${fieldName} cannot be empty.`);
  }
  if (/[[\]\r\n]/u.test(value)) {
    throw new TypeError(`${fieldName} cannot contain brackets or line breaks.`);
  }
}

/**
 * 方法名：formatLogTimestamp
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param timestampMs 方法所需的 timestampMs 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：formatLogRecord
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param record 方法所需的 record 参数。
 * @returns 本次处理得到的结果。
 */
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
