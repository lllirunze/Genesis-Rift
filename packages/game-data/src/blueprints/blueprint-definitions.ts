import type { BlueprintDefinition, BlueprintDefinitionCatalog } from "@genesis-rift/game-core";

/** 当前业务对象的静态定义配置。 */
export const TRAVEL_BOOTS_BLUEPRINT_DEFINITION = {
  blueprintId: "blueprint_000001",
  sourceItemDefinitionId: "item_000012",
  name: "Travel Boots Blueprint",
  productItemDefinitionId: "equip_000003",
  materialRequirements: [
    { itemDefinitionId: "item_000002", quantity: 2 },
    { itemDefinitionId: "item_000003", quantity: 1 },
  ],
  coinCost: 3,
  requiredConditionIds: [],
} as const satisfies BlueprintDefinition;

/** 当前业务对象的静态定义配置。 */
export const LONG_SWORD_BLUEPRINT_DEFINITION = {
  blueprintId: "blueprint_000002",
  sourceItemDefinitionId: "item_000013",
  name: "Long Sword Blueprint",
  productItemDefinitionId: "equip_000002",
  materialRequirements: [
    { itemDefinitionId: "item_000003", quantity: 3 },
    { itemDefinitionId: "item_000004", quantity: 1 },
  ],
  coinCost: 8,
  requiredConditionIds: [],
} as const satisfies BlueprintDefinition;

/** 当前业务对象的静态定义配置。 */
export const HEAVY_PLATE_ARMOR_BLUEPRINT_DEFINITION = {
  blueprintId: "blueprint_000003",
  sourceItemDefinitionId: "item_000014",
  name: "Heavy Plate Armor Blueprint",
  productItemDefinitionId: "equip_000001",
  materialRequirements: [
    { itemDefinitionId: "item_000002", quantity: 2 },
    { itemDefinitionId: "item_000003", quantity: 5 },
    { itemDefinitionId: "item_000004", quantity: 2 },
  ],
  coinCost: 15,
  requiredConditionIds: [],
} as const satisfies BlueprintDefinition;

/** 当前模块对外公开的只读配置注册表。 */
export const BLUEPRINT_DEFINITION_CATALOG = {
  [TRAVEL_BOOTS_BLUEPRINT_DEFINITION.blueprintId]: TRAVEL_BOOTS_BLUEPRINT_DEFINITION,
  [LONG_SWORD_BLUEPRINT_DEFINITION.blueprintId]: LONG_SWORD_BLUEPRINT_DEFINITION,
  [HEAVY_PLATE_ARMOR_BLUEPRINT_DEFINITION.blueprintId]: HEAVY_PLATE_ARMOR_BLUEPRINT_DEFINITION,
} as const satisfies BlueprintDefinitionCatalog;
