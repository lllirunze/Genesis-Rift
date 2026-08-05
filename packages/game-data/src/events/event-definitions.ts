import type { EventDefinition, EventDefinitionCatalog } from "@genesis-rift/game-core";

import { MOUNTAIN_TERRAIN_DEFINITION } from "../maps/terrain-definitions.ts";
import { WILDERNESS_REGION_DEFINITION } from "../maps/region-definitions.ts";
import { HEALTH_RESOURCE_DEFINITION } from "../resources/character-resource-definitions.ts";

/** 强制揭露、包含物资搜索与休息选择的普通探索事件。 */
export const ABANDONED_CAMP_EVENT_DEFINITION = {
  eventId: "event.common.abandoned-camp",
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
  eventId: "event.encounter.wild-beast-attack",
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
  eventId: "event.adventure.ancient-ruins",
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
  eventId: "event.disaster.blizzard",
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
          weatherId: "weather.blizzard",
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

/** 当前正式事件示例组成的统一事件定义注册表。 */
export const EVENT_DEFINITION_CATALOG = {
  [ABANDONED_CAMP_EVENT_DEFINITION.eventId]: ABANDONED_CAMP_EVENT_DEFINITION,
  [WILD_BEAST_ATTACK_EVENT_DEFINITION.eventId]: WILD_BEAST_ATTACK_EVENT_DEFINITION,
  [ANCIENT_RUINS_EVENT_DEFINITION.eventId]: ANCIENT_RUINS_EVENT_DEFINITION,
  [BLIZZARD_EVENT_DEFINITION.eventId]: BLIZZARD_EVENT_DEFINITION,
} as const satisfies EventDefinitionCatalog;
