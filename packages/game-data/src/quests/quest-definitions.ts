import {
  DEFAULT_QUEST_DURATION_TURNS,
  type QuestDefinition,
  type QuestDefinitionCatalog,
} from "@genesis-rift/game-core";

/** 裁缝发布的基础材料委托，用于演示收集类任务与元宝、经验奖励。 */
export const LINEN_DELIVERY_QUEST_DEFINITION = {
  questId: "quest_000001",
  name: "Linen Delivery",
  description: "Collect linen cloth for the town tailor.",
  issuerType: "NPC",
  issuerId: "npc_000001",
  type: "commission",
  quality: "common",
  triggerConditionIds: [],
  acceptConditionIds: [],
  objectives: [
    {
      objectiveId: "collect-linen-cloth",
      type: "COLLECT",
      targetId: "item_000002",
      requiredCount: 3,
    },
  ],
  completionRule: "ALL",
  rewardPoolId: "reward_000001",
  durationTurns: DEFAULT_QUEST_DURATION_TURNS,
  unique: false,
} as const satisfies QuestDefinition;

/** 野狼悬赏，用于演示战斗结算驱动的击败类任务。 */
export const FOREST_WOLF_BOUNTY_QUEST_DEFINITION = {
  questId: "quest_000002",
  name: "Forest Wolf Bounty",
  description: "Defeat the forest wolves threatening the wilderness road.",
  issuerType: "NPC",
  issuerId: "npc_000001",
  type: "bounty",
  quality: "excellent",
  triggerConditionIds: [],
  acceptConditionIds: [],
  objectives: [
    { objectiveId: "defeat-forest-wolf", type: "DEFEAT", targetId: "npc_000002", requiredCount: 2 },
  ],
  completionRule: "ALL",
  rewardPoolId: "reward_000002",
  durationTurns: 20,
  unique: false,
} as const satisfies QuestDefinition;

/** 古代遗迹隐藏任务，用于演示事件触发的唯一探索任务。 */
export const ANCIENT_RUINS_DISCOVERY_QUEST_DEFINITION = {
  questId: "quest_000003",
  name: "Ancient Ruins Discovery",
  description: "Investigate the ancient ruins and recover its hidden knowledge.",
  issuerType: "EVENT",
  issuerId: "event_000003",
  type: "hidden",
  quality: "rare",
  triggerConditionIds: [],
  acceptConditionIds: [],
  objectives: [
    {
      objectiveId: "investigate-ancient-ruins",
      type: "INVESTIGATE",
      targetId: "region_000001",
      requiredCount: 1,
    },
  ],
  completionRule: "ALL",
  rewardPoolId: "reward_000003",
  durationTurns: DEFAULT_QUEST_DURATION_TURNS,
  unique: true,
} as const satisfies QuestDefinition;

/** 游戏数据层提供的任务定义注册表。 */
export const QUEST_DEFINITION_CATALOG = {
  [LINEN_DELIVERY_QUEST_DEFINITION.questId]: LINEN_DELIVERY_QUEST_DEFINITION,
  [FOREST_WOLF_BOUNTY_QUEST_DEFINITION.questId]: FOREST_WOLF_BOUNTY_QUEST_DEFINITION,
  [ANCIENT_RUINS_DISCOVERY_QUEST_DEFINITION.questId]: ANCIENT_RUINS_DISCOVERY_QUEST_DEFINITION,
} as const satisfies QuestDefinitionCatalog;
