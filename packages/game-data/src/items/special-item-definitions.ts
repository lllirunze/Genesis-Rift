import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 当前业务对象的静态定义配置。 */
export const CLIMBING_ROPE_ITEM_DEFINITION = {
  definitionId: "item_000009",
  name: "Climbing Rope",
  category: "special",
  quality: "common",
  width: 1,
  height: 3,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TORCH_ITEM_DEFINITION = {
  definitionId: "item_000010",
  name: "Torch",
  category: "special",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TREASURE_MAP_ITEM_DEFINITION = {
  definitionId: "item_000011",
  name: "Treasure Map",
  category: "special",
  quality: "rare",
  width: 2,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TRAVEL_BOOTS_BLUEPRINT_ITEM_DEFINITION = {
  definitionId: "item_000012",
  name: "Travel Boots Blueprint",
  category: "special",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const LONG_SWORD_BLUEPRINT_ITEM_DEFINITION = {
  definitionId: "item_000013",
  name: "Long Sword Blueprint",
  category: "special",
  quality: "excellent",
  width: 1,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const HEAVY_PLATE_ARMOR_BLUEPRINT_ITEM_DEFINITION = {
  definitionId: "item_000014",
  name: "Heavy Plate Armor Blueprint",
  category: "special",
  quality: "rare",
  width: 1,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前模块对外公开的只读配置值。 */
export const SPECIAL_ITEM_DEFINITIONS = {
  [CLIMBING_ROPE_ITEM_DEFINITION.definitionId]: CLIMBING_ROPE_ITEM_DEFINITION,
  [TORCH_ITEM_DEFINITION.definitionId]: TORCH_ITEM_DEFINITION,
  [TREASURE_MAP_ITEM_DEFINITION.definitionId]: TREASURE_MAP_ITEM_DEFINITION,
  [TRAVEL_BOOTS_BLUEPRINT_ITEM_DEFINITION.definitionId]: TRAVEL_BOOTS_BLUEPRINT_ITEM_DEFINITION,
  [LONG_SWORD_BLUEPRINT_ITEM_DEFINITION.definitionId]: LONG_SWORD_BLUEPRINT_ITEM_DEFINITION,
  [HEAVY_PLATE_ARMOR_BLUEPRINT_ITEM_DEFINITION.definitionId]:
    HEAVY_PLATE_ARMOR_BLUEPRINT_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
