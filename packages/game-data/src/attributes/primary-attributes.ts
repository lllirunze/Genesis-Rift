import { PRIMARY_ATTRIBUTE_KEYS, type PrimaryAttributes } from "@genesis-rift/shared";

export {
  PRIMARY_ATTRIBUTE_KEYS,
  type PrimaryAttribute,
  type PrimaryAttributes,
  type PrimaryAttributeOffset,
} from "@genesis-rift/shared";

export function getPrimaryAttributeTotal(attributes: PrimaryAttributes): number {
  return PRIMARY_ATTRIBUTE_KEYS.reduce((total, key) => total + attributes[key], 0);
}
