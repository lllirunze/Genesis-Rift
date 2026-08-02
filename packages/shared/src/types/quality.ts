import {
  QUALITY_LEVELS,
  RESERVED_QUALITY_LEVELS,
  STANDARD_QUALITY_LEVELS,
} from "../config/quality-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type StandardQuality = (typeof STANDARD_QUALITY_LEVELS)[number];
/** 为未来扩展预留、当前不参与常规内容生成的品质。 */
export type ReservedQuality = (typeof RESERVED_QUALITY_LEVELS)[number];
/** 游戏资源可以使用的完整品质联合类型。 */
export type Quality = (typeof QUALITY_LEVELS)[number];

/**
 * 方法名：isQuality
 * 作用：判断外部输入是否为系统已声明的任意品质。
 * @param value 待校验的外部输入。
 * @returns 输入属于完整品质集合时返回 true。
 */
export function isQuality(value: unknown): value is Quality {
  return typeof value === "string" && QUALITY_LEVELS.some((quality) => quality === value);
}

/**
 * 方法名：isStandardQuality
 * 作用：判断外部输入是否为当前版本可正常使用的品质。
 * @param value 待校验的外部输入。
 * @returns 输入属于标准品质集合时返回 true。
 */
export function isStandardQuality(value: unknown): value is StandardQuality {
  return typeof value === "string" && STANDARD_QUALITY_LEVELS.some((quality) => quality === value);
}

/**
 * 方法名：isReservedQuality
 * 作用：判断外部输入是否为仅供未来版本扩展的预留品质。
 * @param value 待校验的外部输入。
 * @returns 输入属于预留品质集合时返回 true。
 */
export function isReservedQuality(value: unknown): value is ReservedQuality {
  return typeof value === "string" && RESERVED_QUALITY_LEVELS.some((quality) => quality === value);
}
