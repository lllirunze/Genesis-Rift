import type { EventPoolDefinition, EventPoolDefinitionCatalog } from "@genesis-rift/game-core";

import {
  ABANDONED_CAMP_EVENT_DEFINITION,
  ANCIENT_RUINS_EVENT_DEFINITION,
  BLIZZARD_EVENT_DEFINITION,
  EARTH_BLESSING_EVENT_DEFINITION,
  HARVEST_ERA_EVENT_DEFINITION,
  LUCKY_GODDESS_EVENT_DEFINITION,
  MYSTERIOUS_TRAVELER_EVENT_DEFINITION,
  QUEST_COMPLETION_REWARD_EVENT_DEFINITION,
  WEAKENING_CURSE_EVENT_DEFINITION,
  YIFEI_BOUNCE_STRIKE_EVENT_DEFINITION,
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

/** 玩家触发命运类探索入口时使用的个人命运事件池。 */
export const DESTINY_EXPLORATION_EVENT_POOL = {
  poolId: "event-pool.destiny.exploration",
  name: "Destiny Exploration",
  entries: [
    { eventId: LUCKY_GODDESS_EVENT_DEFINITION.eventId, weightAdjustment: 0 },
    { eventId: EARTH_BLESSING_EVENT_DEFINITION.eventId, weightAdjustment: 0 },
    { eventId: WEAKENING_CURSE_EVENT_DEFINITION.eventId, weightAdjustment: 0 },
    { eventId: YIFEI_BOUNCE_STRIKE_EVENT_DEFINITION.eventId, weightAdjustment: 0 },
  ],
} as const satisfies EventPoolDefinition;

/** 玩家与旅行类 NPC 交互时使用的事件池。 */
export const NPC_TRAVELER_INTERACTION_EVENT_POOL = {
  poolId: "event-pool.npc.traveler-interaction",
  name: "NPC Traveler Interaction",
  entries: [{ eventId: MYSTERIOUS_TRAVELER_EVENT_DEFINITION.eventId, weightAdjustment: 0 }],
} as const satisfies EventPoolDefinition;

/** 玩家完成普通委托阶段时使用的任务事件池。 */
export const QUEST_COMPLETION_EVENT_POOL = {
  poolId: "event-pool.quest.completion",
  name: "Quest Completion",
  entries: [{ eventId: QUEST_COMPLETION_REWARD_EVENT_DEFINITION.eventId, weightAdjustment: 0 }],
} as const satisfies EventPoolDefinition;

/** 天气更新进入山地灾难分支时使用的事件池。 */
export const WEATHER_DISASTER_EVENT_POOL = {
  poolId: "event-pool.weather.disaster",
  name: "Weather Disaster",
  entries: [{ eventId: BLIZZARD_EVENT_DEFINITION.eventId, weightAdjustment: 0 }],
} as const satisfies EventPoolDefinition;

/** 世界状态更新允许产生公共事件时使用的全局事件池。 */
export const WORLD_STATE_EVENT_POOL = {
  poolId: "event-pool.world.state",
  name: "World State",
  entries: [{ eventId: HARVEST_ERA_EVENT_DEFINITION.eventId, weightAdjustment: 0 }],
} as const satisfies EventPoolDefinition;

/** 当前正式示例使用的统一事件池注册表。 */
export const EVENT_POOL_DEFINITION_CATALOG = {
  [WILDERNESS_EXPLORATION_EVENT_POOL.poolId]: WILDERNESS_EXPLORATION_EVENT_POOL,
  [ANCIENT_RUINS_EXPLORATION_EVENT_POOL.poolId]: ANCIENT_RUINS_EXPLORATION_EVENT_POOL,
  [MOUNTAIN_DISASTER_EVENT_POOL.poolId]: MOUNTAIN_DISASTER_EVENT_POOL,
  [DESTINY_EXPLORATION_EVENT_POOL.poolId]: DESTINY_EXPLORATION_EVENT_POOL,
  [NPC_TRAVELER_INTERACTION_EVENT_POOL.poolId]: NPC_TRAVELER_INTERACTION_EVENT_POOL,
  [QUEST_COMPLETION_EVENT_POOL.poolId]: QUEST_COMPLETION_EVENT_POOL,
  [WEATHER_DISASTER_EVENT_POOL.poolId]: WEATHER_DISASTER_EVENT_POOL,
  [WORLD_STATE_EVENT_POOL.poolId]: WORLD_STATE_EVENT_POOL,
} as const satisfies EventPoolDefinitionCatalog;
