import {
  MAX_RESOURCE_ID_NUMBER,
  MIN_RESOURCE_ID_NUMBER,
  RESOURCE_ID_PREFIXES,
} from "../config/resource-id-config.ts";
import type { ResourceId, ResourceIdPrefix } from "../types/resource-id.ts";

const RESOURCE_ID_PATTERN = /^([a-z]+)_([0-9]{6})$/;

/**
 * 方法名：isResourceId
 * 作用：判断字符串是否为使用已登记前缀且编号有效的静态资源 ID。
 * @param value 需要判断的字符串。
 * @returns 符合资源 ID 规范时返回 true，否则返回 false。
 */
export function isResourceId(value: string): value is ResourceId {
  const match = RESOURCE_ID_PATTERN.exec(value);

  if (match === null) {
    return false;
  }

  const prefix = match[1];
  const numberText = match[2];

  if (
    prefix === undefined ||
    numberText === undefined ||
    !RESOURCE_ID_PREFIXES.includes(prefix as ResourceIdPrefix)
  ) {
    return false;
  }

  const number = Number(numberText);
  return number >= MIN_RESOURCE_ID_NUMBER && number <= MAX_RESOURCE_ID_NUMBER;
}

/**
 * 方法名：isResourceIdForPrefix
 * 作用：判断字符串是否为指定资源类型的合法静态资源 ID。
 * @param value 需要判断的字符串。
 * @param prefix 期望使用的资源类型前缀。
 * @returns 格式、编号和前缀均符合要求时返回 true，否则返回 false。
 */
export function isResourceIdForPrefix<Prefix extends ResourceIdPrefix>(
  value: string,
  prefix: Prefix,
): value is ResourceId<Prefix> {
  return isResourceId(value) && value.startsWith(`${prefix}_`);
}

/**
 * 方法名：assertResourceId
 * 作用：校验字符串为合法静态资源 ID，并可限制其资源类型前缀。
 * @param value 需要校验的字符串。
 * @param expectedPrefix 可选的期望资源类型前缀。
 * @returns 无返回值。
 * @throws ID 格式、编号、前缀登记或期望前缀不符合规范时抛出错误。
 */
export function assertResourceId(
  value: string,
  expectedPrefix?: ResourceIdPrefix,
): asserts value is ResourceId {
  const match = RESOURCE_ID_PATTERN.exec(value);

  if (match === null) {
    throw new TypeError(`Resource id must match <type>_<6 digits>: ${value}`);
  }

  const prefix = match[1];
  const numberText = match[2];

  if (
    prefix === undefined ||
    numberText === undefined ||
    !RESOURCE_ID_PREFIXES.includes(prefix as ResourceIdPrefix)
  ) {
    throw new RangeError(`Unsupported resource id prefix: ${prefix ?? ""}`);
  }

  const number = Number(numberText);

  if (number < MIN_RESOURCE_ID_NUMBER || number > MAX_RESOURCE_ID_NUMBER) {
    throw new RangeError(`Resource id number must be between 000001 and 999999: ${value}`);
  }

  if (expectedPrefix !== undefined && prefix !== expectedPrefix) {
    throw new RangeError(`Resource id must use ${expectedPrefix} prefix: ${value}`);
  }
}
