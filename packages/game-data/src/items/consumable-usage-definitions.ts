import type { ConsumableUsageCatalog, ConsumableUsageDefinition } from "@genesis-rift/game-core";

import {
  ANTIDOTE_ITEM_DEFINITION,
  HEALING_POTION_ITEM_DEFINITION,
  MANA_POTION_ITEM_DEFINITION,
  WIND_TONIC_ITEM_DEFINITION,
} from "./consumable-item-definitions.ts";
import {
  POISONED_STATUS_DEFINITION,
  WIND_BLESSING_STATUS_DEFINITION,
} from "../statuses/status-definitions.ts";

/** 当前业务对象的静态定义配置。 */
export const HEALING_POTION_USAGE_DEFINITION = {
  itemDefinitionId: HEALING_POTION_ITEM_DEFINITION.definitionId,
  effects: [
    {
      effectId: "resource.restore",
      parameters: { resourceId: "health", amount: 25 },
    },
  ],
} as const satisfies ConsumableUsageDefinition;

/** 当前业务对象的静态定义配置。 */
export const MANA_POTION_USAGE_DEFINITION = {
  itemDefinitionId: MANA_POTION_ITEM_DEFINITION.definitionId,
  effects: [
    {
      effectId: "resource.restore",
      parameters: { resourceId: "mana", amount: 20 },
    },
  ],
} as const satisfies ConsumableUsageDefinition;

/** 当前业务对象的静态定义配置。 */
export const ANTIDOTE_USAGE_DEFINITION = {
  itemDefinitionId: ANTIDOTE_ITEM_DEFINITION.definitionId,
  effects: [
    {
      effectId: "status.remove",
      parameters: { statusDefinitionId: POISONED_STATUS_DEFINITION.definitionId },
    },
  ],
} as const satisfies ConsumableUsageDefinition;

/** 当前业务对象的静态定义配置。 */
export const WIND_TONIC_USAGE_DEFINITION = {
  itemDefinitionId: WIND_TONIC_ITEM_DEFINITION.definitionId,
  effects: [
    {
      effectId: "status.add",
      parameters: { statusDefinitionId: WIND_BLESSING_STATUS_DEFINITION.definitionId },
    },
  ],
} as const satisfies ConsumableUsageDefinition;

/** 当前模块使用的只读配置注册表。 */
export const CONSUMABLE_USAGE_CATALOG = {
  [HEALING_POTION_USAGE_DEFINITION.itemDefinitionId]: HEALING_POTION_USAGE_DEFINITION,
  [MANA_POTION_USAGE_DEFINITION.itemDefinitionId]: MANA_POTION_USAGE_DEFINITION,
  [ANTIDOTE_USAGE_DEFINITION.itemDefinitionId]: ANTIDOTE_USAGE_DEFINITION,
  [WIND_TONIC_USAGE_DEFINITION.itemDefinitionId]: WIND_TONIC_USAGE_DEFINITION,
} as const satisfies ConsumableUsageCatalog;
