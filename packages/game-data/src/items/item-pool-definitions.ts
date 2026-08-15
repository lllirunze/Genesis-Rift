import type { ItemPoolDefinitionCatalog } from "@genesis-rift/game-core";

import {
  IRON_ORE_ITEM_DEFINITION,
  LINEN_CLOTH_ITEM_DEFINITION,
  MAGIC_DUST_ITEM_DEFINITION,
} from "./material-item-definitions.ts";
import {
  HEAVY_PLATE_ARMOR_BLUEPRINT_ITEM_DEFINITION,
  LONG_SWORD_BLUEPRINT_ITEM_DEFINITION,
  TRAVEL_BOOTS_BLUEPRINT_ITEM_DEFINITION,
} from "./special-item-definitions.ts";

/** 野外常见材料池，用于营地搜索等基础探索奖励。 */
export const COMMON_MATERIAL_ITEM_POOL = {
  poolId: "item-pool.region.current.common-material",
  entries: [
    { itemDefinitionId: LINEN_CLOTH_ITEM_DEFINITION.definitionId, quantity: 1, weight: 50 },
    { itemDefinitionId: IRON_ORE_ITEM_DEFINITION.definitionId, quantity: 1, weight: 50 },
  ],
} as const;

/** 遗迹知识奖励池，当前使用可由鉴定和制造系统继续处理的图纸物品。 */
export const UNKNOWN_BLUEPRINT_ITEM_POOL = {
  poolId: "item-pool.blueprint.current-stage.unknown",
  entries: [
    {
      itemDefinitionId: TRAVEL_BOOTS_BLUEPRINT_ITEM_DEFINITION.definitionId,
      quantity: 1,
      weight: 60,
    },
    {
      itemDefinitionId: LONG_SWORD_BLUEPRINT_ITEM_DEFINITION.definitionId,
      quantity: 1,
      weight: 30,
    },
    {
      itemDefinitionId: HEAVY_PLATE_ARMOR_BLUEPRINT_ITEM_DEFINITION.definitionId,
      quantity: 1,
      weight: 10,
    },
  ],
} as const;

/** 遗迹稀有材料池，当前首批内容以魔法粉尘作为稳定示例。 */
export const RARE_MATERIAL_ITEM_POOL = {
  poolId: "item-pool.region.current.rare-material",
  entries: [
    { itemDefinitionId: MAGIC_DUST_ITEM_DEFINITION.definitionId, quantity: 1, weight: 100 },
  ],
} as const;

/** 当前版本所有可由事件与奖励系统引用的正式物品池配置。 */
export const ITEM_POOL_DEFINITION_CATALOG = {
  [COMMON_MATERIAL_ITEM_POOL.poolId]: COMMON_MATERIAL_ITEM_POOL,
  [UNKNOWN_BLUEPRINT_ITEM_POOL.poolId]: UNKNOWN_BLUEPRINT_ITEM_POOL,
  [RARE_MATERIAL_ITEM_POOL.poolId]: RARE_MATERIAL_ITEM_POOL,
} as const satisfies ItemPoolDefinitionCatalog;
