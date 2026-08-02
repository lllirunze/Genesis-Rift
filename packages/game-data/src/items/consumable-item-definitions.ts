import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

export const HEALING_POTION_ITEM_DEFINITION = {
  definitionId: "item.consumable.healing-potion",
  name: "Healing Potion",
  category: "consumable",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

export const MANA_POTION_ITEM_DEFINITION = {
  definitionId: "item.consumable.mana-potion",
  name: "Mana Potion",
  category: "consumable",
  quality: "common",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

export const ANTIDOTE_ITEM_DEFINITION = {
  definitionId: "item.consumable.antidote",
  name: "Antidote",
  category: "consumable",
  quality: "excellent",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

export const WIND_TONIC_ITEM_DEFINITION = {
  definitionId: "item.consumable.wind-tonic",
  name: "Wind Tonic",
  category: "consumable",
  quality: "excellent",
  width: 1,
  height: 2,
  maximumStack: 3,
} as const satisfies ItemDefinition;

export const CONSUMABLE_ITEM_DEFINITIONS = {
  [HEALING_POTION_ITEM_DEFINITION.definitionId]: HEALING_POTION_ITEM_DEFINITION,
  [MANA_POTION_ITEM_DEFINITION.definitionId]: MANA_POTION_ITEM_DEFINITION,
  [ANTIDOTE_ITEM_DEFINITION.definitionId]: ANTIDOTE_ITEM_DEFINITION,
  [WIND_TONIC_ITEM_DEFINITION.definitionId]: WIND_TONIC_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
