import type { ShopDefinition, ShopDefinitionCatalog } from "@genesis-rift/game-core";

/** 城镇补给商店出售常用药剂与基础材料。 */
export const FRONTIER_SUPPLY_SHOP_DEFINITION = {
  definitionId: "shop_000001",
  name: "frontierSupplyShop",
  items: [
    { itemDefinitionId: "item_000005", unitCoinPrice: 2 },
    { itemDefinitionId: "item_000006", unitCoinPrice: 2 },
    { itemDefinitionId: "item_000007", unitCoinPrice: 4 },
    { itemDefinitionId: "item_000002", unitCoinPrice: 1 },
    { itemDefinitionId: "item_000003", unitCoinPrice: 2 },
  ],
} as const satisfies ShopDefinition;

/** 当前版本提供的商店静态定义注册表。 */
export const SHOP_DEFINITION_CATALOG = {
  [FRONTIER_SUPPLY_SHOP_DEFINITION.definitionId]: FRONTIER_SUPPLY_SHOP_DEFINITION,
} as const satisfies ShopDefinitionCatalog;
