import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

export const LINEN_CLOTH_ITEM_DEFINITION = {
  definitionId: "item.material.linen-cloth",
  name: "Linen Cloth",
  category: "material",
  quality: "common",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

export const IRON_ORE_ITEM_DEFINITION = {
  definitionId: "item.material.iron-ore",
  name: "Iron Ore",
  category: "material",
  quality: "common",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

export const MAGIC_DUST_ITEM_DEFINITION = {
  definitionId: "item.material.magic-dust",
  name: "Magic Dust",
  category: "material",
  quality: "excellent",
  width: 1,
  height: 1,
  maximumStack: 10,
} as const satisfies ItemDefinition;

export const MATERIAL_ITEM_DEFINITIONS = {
  [LINEN_CLOTH_ITEM_DEFINITION.definitionId]: LINEN_CLOTH_ITEM_DEFINITION,
  [IRON_ORE_ITEM_DEFINITION.definitionId]: IRON_ORE_ITEM_DEFINITION,
  [MAGIC_DUST_ITEM_DEFINITION.definitionId]: MAGIC_DUST_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
