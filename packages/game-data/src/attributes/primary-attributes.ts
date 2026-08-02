import { PRIMARY_ATTRIBUTE_KEYS, type PrimaryAttributes } from "@genesis-rift/shared";

export {
  PRIMARY_ATTRIBUTE_KEYS,
  type PrimaryAttribute,
  type PrimaryAttributes,
  type PrimaryAttributeOffset,
} from "@genesis-rift/shared";

/**
 * 方法名：getPrimaryAttributeTotal
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param attributes 待汇总的完整基础属性。
 * @returns 五项基础属性的整数总和。
 */
export function getPrimaryAttributeTotal(attributes: PrimaryAttributes): number {
  return PRIMARY_ATTRIBUTE_KEYS.reduce((total, key) => total + attributes[key], 0);
}
