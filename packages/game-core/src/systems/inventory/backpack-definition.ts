import { BACKPACK_LEVELS, BACKPACK_USABLE_AREAS } from "./backpack-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type BackpackLevel = (typeof BACKPACK_LEVELS)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface BackpackUsableArea {
  readonly width: number;
  readonly height: number;
}

/**
 * 方法名：getBackpackUsableArea
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param level 方法所需的 level 参数。
 * @returns 本次处理得到的结果。
 */
export function getBackpackUsableArea(level: BackpackLevel): BackpackUsableArea {
  return BACKPACK_USABLE_AREAS[level];
}

/**
 * 方法名：isBackpackLevel
 * 作用：判断输入是否满足当前业务条件。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function isBackpackLevel(value: unknown): value is BackpackLevel {
  return typeof value === "number" && BACKPACK_LEVELS.some((level) => level === value);
}
