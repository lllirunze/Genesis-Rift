import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 当前业务对象的静态定义配置。 */
export const CLIMBING_ROPE_ITEM_DEFINITION = {
  definitionId: "item.special.climbing-rope",
  name: "Climbing Rope",
  category: "special",
  quality: "common",
  width: 1,
  height: 3,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TORCH_ITEM_DEFINITION = {
  definitionId: "item.special.torch",
  name: "Torch",
  category: "special",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TREASURE_MAP_ITEM_DEFINITION = {
  definitionId: "item.special.treasure-map",
  name: "Treasure Map",
  category: "special",
  quality: "rare",
  width: 2,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前模块对外公开的只读配置值。 */
export const SPECIAL_ITEM_DEFINITIONS = {
  [CLIMBING_ROPE_ITEM_DEFINITION.definitionId]: CLIMBING_ROPE_ITEM_DEFINITION,
  [TORCH_ITEM_DEFINITION.definitionId]: TORCH_ITEM_DEFINITION,
  [TREASURE_MAP_ITEM_DEFINITION.definitionId]: TREASURE_MAP_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
