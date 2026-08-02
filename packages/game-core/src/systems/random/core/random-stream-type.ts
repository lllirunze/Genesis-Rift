import { RANDOM_STREAM_TYPES } from "./random-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type RandomStreamType = (typeof RANDOM_STREAM_TYPES)[number];

/**
 * 方法名：isRandomStreamType
 * 作用：判断输入是否满足当前业务条件。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function isRandomStreamType(value: string): value is RandomStreamType {
  return RANDOM_STREAM_TYPES.some((streamType) => streamType === value);
}
