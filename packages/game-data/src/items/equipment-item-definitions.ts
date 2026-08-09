import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 当前业务对象的静态定义配置。 */
export const HEAVY_PLATE_ARMOR_ITEM_DEFINITION = {
  definitionId: "equip_000001",
  name: "Heavy Plate Armor",
  category: "equipment",
  quality: "rare",
  width: 3,
  height: 4,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const LONG_SWORD_ITEM_DEFINITION = {
  definitionId: "equip_000002",
  name: "Long Sword",
  category: "equipment",
  quality: "excellent",
  width: 2,
  height: 4,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const TRAVEL_BOOTS_ITEM_DEFINITION = {
  definitionId: "equip_000003",
  name: "Travel Boots",
  category: "equipment",
  quality: "common",
  width: 2,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const FORTUNE_PENDANT_ITEM_DEFINITION = {
  definitionId: "equip_000004",
  name: "Fortune Pendant",
  category: "equipment",
  quality: "excellent",
  width: 1,
  height: 1,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前业务对象的静态定义配置。 */
export const SURVEYOR_LENS_ITEM_DEFINITION = {
  definitionId: "equip_000005",
  name: "Surveyor Lens",
  category: "equipment",
  quality: "rare",
  width: 2,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

/** 当前模块对外公开的只读配置值。 */
export const EQUIPMENT_ITEM_DEFINITIONS = {
  [HEAVY_PLATE_ARMOR_ITEM_DEFINITION.definitionId]: HEAVY_PLATE_ARMOR_ITEM_DEFINITION,
  [LONG_SWORD_ITEM_DEFINITION.definitionId]: LONG_SWORD_ITEM_DEFINITION,
  [TRAVEL_BOOTS_ITEM_DEFINITION.definitionId]: TRAVEL_BOOTS_ITEM_DEFINITION,
  [FORTUNE_PENDANT_ITEM_DEFINITION.definitionId]: FORTUNE_PENDANT_ITEM_DEFINITION,
  [SURVEYOR_LENS_ITEM_DEFINITION.definitionId]: SURVEYOR_LENS_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
