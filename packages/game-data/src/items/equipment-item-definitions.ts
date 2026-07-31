import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

export const HEAVY_PLATE_ARMOR_ITEM_DEFINITION = {
  definitionId: "item.equipment.heavy-plate-armor",
  name: "Heavy Plate Armor",
  category: "equipment",
  quality: "rare",
  width: 3,
  height: 4,
  maximumStack: 1,
} as const satisfies ItemDefinition;

export const LONG_SWORD_ITEM_DEFINITION = {
  definitionId: "item.equipment.long-sword",
  name: "Long Sword",
  category: "equipment",
  quality: "excellent",
  width: 2,
  height: 4,
  maximumStack: 1,
} as const satisfies ItemDefinition;

export const TRAVEL_BOOTS_ITEM_DEFINITION = {
  definitionId: "item.equipment.travel-boots",
  name: "Travel Boots",
  category: "equipment",
  quality: "common",
  width: 2,
  height: 2,
  maximumStack: 1,
} as const satisfies ItemDefinition;

export const EQUIPMENT_ITEM_DEFINITIONS = {
  [HEAVY_PLATE_ARMOR_ITEM_DEFINITION.definitionId]: HEAVY_PLATE_ARMOR_ITEM_DEFINITION,
  [LONG_SWORD_ITEM_DEFINITION.definitionId]: LONG_SWORD_ITEM_DEFINITION,
  [TRAVEL_BOOTS_ITEM_DEFINITION.definitionId]: TRAVEL_BOOTS_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
