import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinition,
  type ItemDefinitionCatalog,
} from "@genesis-rift/shared";

/** 当前业务对象的静态定义配置。 */
export const COIN_ITEM_DEFINITION = {
  definitionId: COIN_ITEM_DEFINITION_ID,
  name: "Coin",
  category: "currency",
  quality: "common",
  width: 1,
  height: 1,
  maximumStack: 5,
} as const satisfies ItemDefinition;

/** 当前模块对外公开的只读配置值。 */
export const CURRENCY_ITEM_DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: COIN_ITEM_DEFINITION,
} as const satisfies ItemDefinitionCatalog;
