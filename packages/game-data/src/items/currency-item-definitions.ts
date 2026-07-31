import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinition,
  type ItemDefinitionCatalog,
} from "@genesis-rift/shared";

export const COIN_ITEM_DEFINITION = {
  definitionId: COIN_ITEM_DEFINITION_ID,
  name: "Coin",
  category: "currency",
  quality: "common",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

export const CURRENCY_ITEM_DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: COIN_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
