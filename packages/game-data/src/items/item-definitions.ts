import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import { CONSUMABLE_ITEM_DEFINITIONS } from "./consumable-item-definitions.ts";
import { CURRENCY_ITEM_DEFINITIONS } from "./currency-item-definitions.ts";
import { EQUIPMENT_ITEM_DEFINITIONS } from "./equipment-item-definitions.ts";
import { MATERIAL_ITEM_DEFINITIONS } from "./material-item-definitions.ts";
import { SPECIAL_ITEM_DEFINITIONS } from "./special-item-definitions.ts";

export * from "./consumable-item-definitions.ts";
export * from "./consumable-usage-definitions.ts";
export * from "./currency-item-definitions.ts";
export * from "./equipment-item-definitions.ts";
export * from "./material-item-definitions.ts";
export * from "./item-pool-definitions.ts";
export * from "./special-item-definitions.ts";

/** 当前模块使用的只读配置注册表。 */
export const ITEM_DEFINITION_CATALOG = {
  ...CURRENCY_ITEM_DEFINITIONS,
  ...MATERIAL_ITEM_DEFINITIONS,
  ...CONSUMABLE_ITEM_DEFINITIONS,
  ...SPECIAL_ITEM_DEFINITIONS,
  ...EQUIPMENT_ITEM_DEFINITIONS,
} as const satisfies ItemDefinitionCatalog;
