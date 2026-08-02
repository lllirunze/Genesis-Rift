import { LOG_LEVELS } from "./log-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * 方法名：isLogLevel
 * 作用：判断输入是否满足当前业务条件。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.some((level) => level === value);
}
