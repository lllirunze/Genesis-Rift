import {
  ITEM_CATEGORIES,
  isQuality,
  type ItemDefinition,
  type ItemDefinitionCatalog,
} from "@genesis-rift/shared";

import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";

export {
  ITEM_CATEGORIES,
  type ItemCategory,
  type ItemDefinition,
  type ItemDefinitionCatalog,
} from "@genesis-rift/shared";

/**
 * 方法名：validateItemDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateItemDefinition(definition: ItemDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");

  if (!ITEM_CATEGORIES.some((category) => category === definition.category)) {
    throw new RangeError(`Unsupported item category: ${definition.category as string}`);
  }

  if (!isQuality(definition.quality)) {
    throw new RangeError(`Unsupported item quality: ${definition.quality as string}`);
  }

  assertPositiveSafeInteger(definition.width, "width");
  assertPositiveSafeInteger(definition.height, "height");
  assertPositiveSafeInteger(definition.maximumStack, "maximumStack");

  if (definition.width > BACKPACK_GRID_WIDTH || definition.height > BACKPACK_GRID_HEIGHT) {
    throw new RangeError(
      `item dimensions must fit within the maximum ${BACKPACK_GRID_WIDTH} x ${BACKPACK_GRID_HEIGHT} backpack grid`,
    );
  }
}

/**
 * 方法名：validateItemDefinitionCatalog
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateItemDefinitionCatalog(catalog: ItemDefinitionCatalog): void {
  for (const [definitionId, definition] of Object.entries(catalog)) {
    if (definitionId !== definition.definitionId) {
      throw new Error(
        `Item definition catalog key ${definitionId} does not match ${definition.definitionId}`,
      );
    }

    validateItemDefinition(definition);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}
