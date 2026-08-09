import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../random/core/random-seed.ts";
import { RandomStream } from "../random/core/random-stream.ts";

import { generateQuestRewards, validateQuestRewardPoolDefinition } from "./quest-reward-pool.ts";

const QUEST_RANDOM_STREAM = () =>
  RandomStream.create("quest", "quest-reward-test", createRandomStreamSeed("0123456789abcdef"));

const REWARD_POOL = {
  rewardPoolId: "reward_000001",
  fixedRewards: [{ rewardId: "coin", type: "COIN", targetId: null, amount: 5 }],
  randomRewards: [
    {
      candidateId: "experience",
      weight: 1,
      reward: { rewardId: "experience", type: "EXPERIENCE", targetId: null, amount: 10 },
    },
    {
      candidateId: "hand-card",
      weight: 1,
      reward: { rewardId: "hand-card", type: "HAND_CARD", targetId: null, amount: 1 },
    },
  ],
  randomDrawCount: 1,
} as const;

describe("quest reward pools", () => {
  it("固定奖励始终生成，随机奖励只按权重抽取一次且结果可持久化", () => {
    const generated = generateQuestRewards(REWARD_POOL, QUEST_RANDOM_STREAM());

    expect(generated).toHaveLength(2);
    expect(generated[0]).toEqual({ rewardId: "coin", type: "COIN", targetId: null, amount: 5 });
    expect(["experience", "hand-card"]).toContain(generated[1]?.rewardId);
  });

  it("拒绝抽取次数超过随机候选数量的奖励池", () => {
    expect(() => validateQuestRewardPoolDefinition({ ...REWARD_POOL, randomDrawCount: 3 })).toThrow(
      "randomDrawCount cannot exceed",
    );
  });
});
