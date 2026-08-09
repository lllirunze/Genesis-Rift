import type { QuestRewardPoolCatalog } from "@genesis-rift/game-core";

/** 亚麻布委托的固定基础成长奖励。 */
export const LINEN_DELIVERY_REWARD_POOL = {
  rewardPoolId: "reward_000001",
  fixedRewards: [
    { rewardId: "coin", type: "COIN", targetId: null, amount: 5 },
    { rewardId: "experience", type: "EXPERIENCE", targetId: null, amount: 10 },
  ],
  randomRewards: [],
  randomDrawCount: 0,
} as const;

/** 野狼悬赏的战斗收益与手牌奖励。 */
export const FOREST_WOLF_BOUNTY_REWARD_POOL = {
  rewardPoolId: "reward_000002",
  fixedRewards: [
    { rewardId: "coin", type: "COIN", targetId: null, amount: 12 },
    { rewardId: "hand-card", type: "HAND_CARD", targetId: null, amount: 1 },
  ],
  randomRewards: [],
  randomDrawCount: 0,
} as const;

/** 古代遗迹任务的情报与物品奖励。 */
export const ANCIENT_RUINS_DISCOVERY_REWARD_POOL = {
  rewardPoolId: "reward_000003",
  fixedRewards: [
    {
      rewardId: "information",
      type: "INFORMATION",
      targetId: "map-info.ancient-ruins",
      amount: 1,
    },
    { rewardId: "item", type: "ITEM", targetId: "item_000003", amount: 1 },
  ],
  randomRewards: [],
  randomDrawCount: 0,
} as const;

/** 游戏数据层提供的任务奖励池注册表。 */
export const QUEST_REWARD_POOL_CATALOG = {
  [LINEN_DELIVERY_REWARD_POOL.rewardPoolId]: LINEN_DELIVERY_REWARD_POOL,
  [FOREST_WOLF_BOUNTY_REWARD_POOL.rewardPoolId]: FOREST_WOLF_BOUNTY_REWARD_POOL,
  [ANCIENT_RUINS_DISCOVERY_REWARD_POOL.rewardPoolId]: ANCIENT_RUINS_DISCOVERY_REWARD_POOL,
} as const satisfies QuestRewardPoolCatalog;
