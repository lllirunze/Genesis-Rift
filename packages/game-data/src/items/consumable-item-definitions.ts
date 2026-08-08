import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 当前业务对象的静态定义配置。 */
export const HEALING_POTION_ITEM_DEFINITION = {
  definitionId: "item_000005",
  name: "Healing Potion",
  category: "consumable",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const MANA_POTION_ITEM_DEFINITION = {
  definitionId: "item_000006",
  name: "Mana Potion",
  category: "consumable",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const ANTIDOTE_ITEM_DEFINITION = {
  definitionId: "item_000007",
  name: "Antidote",
  category: "consumable",
  quality: "excellent",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const WIND_TONIC_ITEM_DEFINITION = {
  definitionId: "item_000008",
  name: "Wind Tonic",
  category: "consumable",
  quality: "excellent",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

/** 当前模块对外公开的只读配置值。 */
export const CONSUMABLE_ITEM_DEFINITIONS = {
  [HEALING_POTION_ITEM_DEFINITION.definitionId]: HEALING_POTION_ITEM_DEFINITION,
  [MANA_POTION_ITEM_DEFINITION.definitionId]: MANA_POTION_ITEM_DEFINITION,
  [ANTIDOTE_ITEM_DEFINITION.definitionId]: ANTIDOTE_ITEM_DEFINITION,
  [WIND_TONIC_ITEM_DEFINITION.definitionId]: WIND_TONIC_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
