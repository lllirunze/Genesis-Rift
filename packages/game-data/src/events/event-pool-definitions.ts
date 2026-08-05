import type { EventPoolDefinition, EventPoolDefinitionCatalog } from "@genesis-rift/game-core";

import {
  ABANDONED_CAMP_EVENT_DEFINITION,
  ANCIENT_RUINS_EVENT_DEFINITION,
  BLIZZARD_EVENT_DEFINITION,
  WILD_BEAST_ATTACK_EVENT_DEFINITION,
} from "./event-definitions.ts";

/** 玩家在野外执行常规探索时使用的基础事件池。 */
export const WILDERNESS_EXPLORATION_EVENT_POOL = {
  poolId: "event-pool.wilderness.exploration",
  name: "Wilderness Exploration",
  entries: [
    {
      eventId: ABANDONED_CAMP_EVENT_DEFINITION.eventId,
      weightAdjustment: 0,
    },
    {
      eventId: WILD_BEAST_ATTACK_EVENT_DEFINITION.eventId,
      weightAdjustment: 0,
    },
  ],
} as const satisfies EventPoolDefinition;

/** 玩家首次探索古代遗迹特征时使用的专属事件池。 */
export const ANCIENT_RUINS_EXPLORATION_EVENT_POOL = {
  poolId: "event-pool.ancient-ruins.exploration",
  name: "Ancient Ruins Exploration",
  entries: [
    {
      eventId: ANCIENT_RUINS_EVENT_DEFINITION.eventId,
      weightAdjustment: 0,
    },
  ],
} as const satisfies EventPoolDefinition;

/** 山地区域参与灾难事件抽取时使用的事件池。 */
export const MOUNTAIN_DISASTER_EVENT_POOL = {
  poolId: "event-pool.mountain.disaster",
  name: "Mountain Disaster",
  entries: [
    {
      eventId: BLIZZARD_EVENT_DEFINITION.eventId,
      weightAdjustment: 0,
    },
  ],
} as const satisfies EventPoolDefinition;

/** 当前正式示例使用的统一事件池注册表。 */
export const EVENT_POOL_DEFINITION_CATALOG = {
  [WILDERNESS_EXPLORATION_EVENT_POOL.poolId]: WILDERNESS_EXPLORATION_EVENT_POOL,
  [ANCIENT_RUINS_EXPLORATION_EVENT_POOL.poolId]: ANCIENT_RUINS_EXPLORATION_EVENT_POOL,
  [MOUNTAIN_DISASTER_EVENT_POOL.poolId]: MOUNTAIN_DISASTER_EVENT_POOL,
} as const satisfies EventPoolDefinitionCatalog;
