import { LOG_ACTIONS } from "./log-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type LogAction = (typeof LOG_ACTIONS)[number];

/**
 * 方法名：isLogAction
 * 作用：判断输入是否满足当前业务条件。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function isLogAction(value: string): value is LogAction {
  return LOG_ACTIONS.some((action) => action === value);
}
