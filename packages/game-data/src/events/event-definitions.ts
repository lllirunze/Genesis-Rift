import type { EventDefinition, EventDefinitionCatalog } from "@genesis-rift/game-core";

import { MOUNTAIN_TERRAIN_DEFINITION } from "../maps/terrain-definitions.ts";
import { WILDERNESS_REGION_DEFINITION } from "../maps/region-definitions.ts";
import { HEALTH_RESOURCE_DEFINITION } from "../resources/character-resource-definitions.ts";
import {
  BATTLE_FURY_STATUS_DEFINITION,
  EXHAUSTION_STATUS_DEFINITION,
  VITALITY_BLESSING_STATUS_DEFINITION,
  WIND_BLESSING_STATUS_DEFINITION,
} from "../statuses/status-definitions.ts";
import { LINEN_CLOTH_ITEM_DEFINITION } from "../items/material-item-definitions.ts";

/** 强制揭露、包含物资搜索与休息选择的普通探索事件。 */
export const ABANDONED_CAMP_EVENT_DEFINITION = {
  eventId: "event_000001",
  name: "Abandoned Camp",
  description: "The player discovers an abandoned camp in the wilderness.",
  triggerCondition: {
    type: "CONDITION",
    conditionId: "map.regionIs",
    parameters: {
      regionDefinitionId: WILDERNESS_REGION_DEFINITION.definitionId,
    },
  },
  category: "common",
  rarity: "common",
  tags: ["exploration", "wilderness", "recovery", "material"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "searchSupplies",
        name: "Search Supplies",
        description: "Search the abandoned camp for useful materials.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "obtainCommonMaterials",
            effectId: "item.obtainFromPool",
            targetType: "TRIGGER_PLAYER",
            parameters: {
              itemPoolId: "item-pool.region.current.common-material",
              drawCount: 2,
            },
            failurePolicy: "STOP",
          },
        ],
      },
      {
        optionId: "rest",
        name: "Rest",
        description: "Rest at the camp and recover a small amount of health.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "restoreHealth",
            effectId: "characterResource.modify",
            targetType: "TRIGGER_PLAYER",
            parameters: {
              resourceId: HEALTH_RESOURCE_DEFINITION.resourceId,
              amount: 10,
            },
            failurePolicy: "CONTINUE",
          },
        ],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 100,
  cooldownTurns: 2,
} as const satisfies EventDefinition;

/** 强制揭露并为触发玩家创建野外遭遇战斗的事件。 */
export const WILD_BEAST_ATTACK_EVENT_DEFINITION = {
  eventId: "event_000002",
  name: "Wild Beast Attack",
  description: "A wild beast suddenly attacks the player during exploration.",
  triggerCondition: {
    type: "GROUP",
    operator: "ALL",
    conditions: [
      {
        type: "CONDITION",
        conditionId: "map.regionIs",
        parameters: {
          regionDefinitionId: WILDERNESS_REGION_DEFINITION.definitionId,
        },
      },
      {
        type: "CONDITION",
        conditionId: "player.isNotInBattle",
        parameters: {},
      },
    ],
  },
  category: "encounter",
  rarity: "common",
  tags: ["encounter", "battle", "wilderness", "beast"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "startBeastEncounter",
        effectId: "battle.start",
        targetType: "TRIGGER_PLAYER",
        parameters: {
          encounterDefinitionId: "encounter.wilderness.beast",
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 100,
  cooldownTurns: 2,
} as const satisfies EventDefinition;

/** 可选择揭露、提供图纸知识或稀有材料路线的奇遇事件。 */
export const ANCIENT_RUINS_EVENT_DEFINITION = {
  eventId: "event_000003",
  name: "Ancient Ruins",
  description: "The player discovers ancient ruins containing forgotten knowledge and relics.",
  triggerCondition: {
    type: "GROUP",
    operator: "ALL",
    conditions: [
      {
        type: "CONDITION",
        conditionId: "map.featureIs",
        parameters: {
          featureId: "map-feature.ancient-ruins",
        },
      },
      {
        type: "CONDITION",
        conditionId: "exploration.isFirstVisit",
        parameters: {},
      },
    ],
  },
  category: "adventure",
  rarity: "rare",
  tags: ["exploration", "ruins", "blueprint", "rare-material"],
  revealMode: "OPTIONAL",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "studyTablet",
        name: "Study Tablet",
        description: "Study the ancient tablet to recover forgotten crafting knowledge.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "obtainUnknownBlueprint",
            effectId: "item.obtainFromPool",
            targetType: "TRIGGER_PLAYER",
            parameters: {
              itemPoolId: "item-pool.blueprint.current-stage.unknown",
              drawCount: 1,
            },
            failurePolicy: "STOP",
          },
        ],
      },
      {
        optionId: "collectRelics",
        name: "Collect Relics",
        description: "Search the ruins for rare materials instead of studying the tablet.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "obtainRareMaterials",
            effectId: "item.obtainFromPool",
            targetType: "TRIGGER_PLAYER",
            parameters: {
              itemPoolId: "item-pool.region.current.rare-material",
              drawCount: 2,
            },
            failurePolicy: "STOP",
          },
        ],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 40,
  cooldownTurns: 0,
} as const satisfies EventDefinition;

/** 强制揭露并在山地区域制造持续暴风雪的灾难事件。 */
export const BLIZZARD_EVENT_DEFINITION = {
  eventId: "event_000004",
  name: "Blizzard",
  description: "A violent blizzard covers the current mountain region.",
  triggerCondition: {
    type: "CONDITION",
    conditionId: "map.terrainIs",
    parameters: {
      terrainDefinitionId: MOUNTAIN_TERRAIN_DEFINITION.definitionId,
    },
  },
  category: "disaster",
  rarity: "epic",
  tags: ["disaster", "weather", "cold", "mountain"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "changeRegionWeather",
        effectId: "weather.change",
        targetType: "CURRENT_REGION",
        parameters: {
          weatherId: "weather_000004",
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: {
    type: "FIXED_ROUNDS",
    rounds: 3,
    updateTiming: "ROUND_END",
    repeat: { policy: "IGNORE" },
  },
  baseWeight: 15,
  cooldownTurns: 5,
} as const satisfies EventDefinition;

/** 可选择揭露并给予触发玩家短期移动增益的命运事件。 */
export const LUCKY_GODDESS_EVENT_DEFINITION = {
  eventId: "event_000005",
  name: "Lucky Goddess",
  description: "A mysterious blessing offers the player a favorable path through the world.",
  triggerCondition: null,
  category: "destiny",
  rarity: "rare",
  tags: ["destiny", "blessing", "movement"],
  revealMode: "OPTIONAL",
  repeatRule: "oncePerPlayer",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "grantWindBlessing",
        effectId: "status.add",
        targetType: "TRIGGER_PLAYER",
        parameters: {
          statusDefinitionId: WIND_BLESSING_STATUS_DEFINITION.definitionId,
          stacks: 1,
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 40,
  cooldownTurns: 0,
} as const satisfies EventDefinition;

/** 强制揭露并为所有玩家提供生存增益的世界事件。 */
export const HARVEST_ERA_EVENT_DEFINITION = {
  eventId: "event_000006",
  name: "Harvest Era",
  description: "Abundant natural energy strengthens every traveler across the world.",
  triggerCondition: null,
  category: "world",
  rarity: "epic",
  tags: ["world", "harvest", "blessing", "survival"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "blessAllPlayers",
        effectId: "status.add",
        targetType: "ALL_PLAYERS",
        parameters: {
          statusDefinitionId: VITALITY_BLESSING_STATUS_DEFINITION.definitionId,
          stacks: 1,
        },
        failurePolicy: "CONTINUE",
      },
    ],
  },
  duration: {
    type: "FIXED_ROUNDS",
    rounds: 3,
    updateTiming: "ROUND_END",
    repeat: { policy: "IGNORE" },
  },
  baseWeight: 15,
  cooldownTurns: 5,
} as const satisfies EventDefinition;

/** 可选择揭露并给予触发玩家恢复能力的祝福事件。 */
export const EARTH_BLESSING_EVENT_DEFINITION = {
  eventId: "event_000007",
  name: "Earth Blessing",
  description: "The land offers a lasting blessing to the traveler who accepts its call.",
  triggerCondition: null,
  category: "blessing",
  rarity: "excellent",
  tags: ["blessing", "earth", "recovery"],
  revealMode: "OPTIONAL",
  repeatRule: "repeatable",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "grantVitalityBlessing",
        effectId: "status.add",
        targetType: "TRIGGER_PLAYER",
        parameters: {
          statusDefinitionId: VITALITY_BLESSING_STATUS_DEFINITION.definitionId,
          stacks: 1,
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 70,
  cooldownTurns: 3,
} as const satisfies EventDefinition;

/** 可选择揭露并对触发玩家施加虚弱状态的诅咒事件。 */
export const WEAKENING_CURSE_EVENT_DEFINITION = {
  eventId: "event_000008",
  name: "Weakening Curse",
  description: "An unknown presence offers power but leaves the traveler exhausted.",
  triggerCondition: null,
  category: "curse",
  rarity: "rare",
  tags: ["curse", "exhaustion", "risk"],
  revealMode: "OPTIONAL",
  repeatRule: "repeatable",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "applyExhaustion",
        effectId: "status.add",
        targetType: "TRIGGER_PLAYER",
        parameters: {
          statusDefinitionId: EXHAUSTION_STATUS_DEFINITION.definitionId,
          stacks: 1,
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 40,
  cooldownTurns: 3,
} as const satisfies EventDefinition;

/** 强制揭露并通过战斗增益还原原作趣味内容的彩蛋事件。 */
export const YIFEI_BOUNCE_STRIKE_EVENT_DEFINITION = {
  eventId: "event_000009",
  name: "Yifei Bounce Strike",
  description: "A familiar battle cry inspires the player before the next confrontation.",
  triggerCondition: null,
  category: "easterEgg",
  rarity: "legendary",
  tags: ["easter-egg", "original-series", "battle"],
  revealMode: "FORCED",
  repeatRule: "oncePerPlayer",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "grantBattleFury",
        effectId: "status.add",
        targetType: "TRIGGER_PLAYER",
        parameters: {
          statusDefinitionId: BATTLE_FURY_STATUS_DEFINITION.definitionId,
          stacks: 1,
        },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 5,
  cooldownTurns: 0,
} as const satisfies EventDefinition;

/** 由 NPC 交互入口触发并允许玩家选择物资或离开的遭遇事件。 */
export const MYSTERIOUS_TRAVELER_EVENT_DEFINITION = {
  eventId: "event_000010",
  name: "Mysterious Traveler",
  description: "A mysterious traveler offers a small supply before continuing the journey.",
  triggerCondition: null,
  category: "encounter",
  rarity: "excellent",
  tags: ["npc", "traveler", "interaction"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "acceptCloth",
        name: "Accept Cloth",
        description: "Accept a small bundle of useful cloth.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "obtainLinenCloth",
            effectId: "item.obtain",
            targetType: "TRIGGER_PLAYER",
            parameters: {
              itemDefinitionId: LINEN_CLOTH_ITEM_DEFINITION.definitionId,
              quantity: 2,
            },
            failurePolicy: "STOP",
          },
        ],
      },
      {
        optionId: "leave",
        name: "Leave",
        description: "Politely decline the offer and continue the journey.",
        availabilityCondition: null,
        effects: [],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 70,
  cooldownTurns: 2,
} as const satisfies EventDefinition;

/** 在指定任务完成阶段触发并发放元宝奖励的普通事件。 */
export const QUEST_COMPLETION_REWARD_EVENT_DEFINITION = {
  eventId: "event_000011",
  name: "Commission Completion",
  description: "The completed commission is acknowledged and its payment is delivered.",
  triggerCondition: {
    type: "CONDITION",
    conditionId: "quest.stageIs",
    parameters: {
      questId: "quest_000001",
      stageId: "completed",
    },
  },
  category: "common",
  rarity: "common",
  tags: ["quest", "commission", "reward"],
  revealMode: "FORCED",
  repeatRule: "oncePerPlayer",
  resolution: {
    type: "DIRECT",
    effects: [
      {
        effectKey: "grantCommissionCoin",
        effectId: "coin.modify",
        targetType: "TRIGGER_PLAYER",
        parameters: { amount: 3 },
        failurePolicy: "STOP",
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 100,
  cooldownTurns: 0,
} as const satisfies EventDefinition;

/** 当前正式事件示例组成的统一事件定义注册表。 */
export const EVENT_DEFINITION_CATALOG = {
  [ABANDONED_CAMP_EVENT_DEFINITION.eventId]: ABANDONED_CAMP_EVENT_DEFINITION,
  [WILD_BEAST_ATTACK_EVENT_DEFINITION.eventId]: WILD_BEAST_ATTACK_EVENT_DEFINITION,
  [ANCIENT_RUINS_EVENT_DEFINITION.eventId]: ANCIENT_RUINS_EVENT_DEFINITION,
  [BLIZZARD_EVENT_DEFINITION.eventId]: BLIZZARD_EVENT_DEFINITION,
  [LUCKY_GODDESS_EVENT_DEFINITION.eventId]: LUCKY_GODDESS_EVENT_DEFINITION,
  [HARVEST_ERA_EVENT_DEFINITION.eventId]: HARVEST_ERA_EVENT_DEFINITION,
  [EARTH_BLESSING_EVENT_DEFINITION.eventId]: EARTH_BLESSING_EVENT_DEFINITION,
  [WEAKENING_CURSE_EVENT_DEFINITION.eventId]: WEAKENING_CURSE_EVENT_DEFINITION,
  [YIFEI_BOUNCE_STRIKE_EVENT_DEFINITION.eventId]: YIFEI_BOUNCE_STRIKE_EVENT_DEFINITION,
  [MYSTERIOUS_TRAVELER_EVENT_DEFINITION.eventId]: MYSTERIOUS_TRAVELER_EVENT_DEFINITION,
  [QUEST_COMPLETION_REWARD_EVENT_DEFINITION.eventId]: QUEST_COMPLETION_REWARD_EVENT_DEFINITION,
} as const satisfies EventDefinitionCatalog;
