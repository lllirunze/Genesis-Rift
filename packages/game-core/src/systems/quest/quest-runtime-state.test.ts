import { describe, expect, it } from "vitest";

import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";
import type { QuestDefinitionCatalog } from "./quest-definition.ts";
import type { QuestRewardPoolCatalog } from "./quest-reward-pool.ts";
import {
  abandonQuest,
  acceptQuest,
  advanceQuestDurations,
  applyQuestProgressEvent,
  claimQuestRewards,
  createPlayerQuestState,
  createUniqueQuestRegistryState,
  generateQuestRewardResults,
  offerQuest,
} from "./quest-runtime-state.ts";

const QUEST_REWARD_POOLS = {
  reward_000001: {
    rewardPoolId: "reward_000001",
    fixedRewards: [
      { rewardId: "coin", type: "COIN", targetId: null, amount: 3 },
      { rewardId: "experience", type: "EXPERIENCE", targetId: null, amount: 5 },
    ],
    randomRewards: [],
    randomDrawCount: 0,
  },
} as const satisfies QuestRewardPoolCatalog;

const QUEST_CATALOG = {
  quest_000001: {
    questId: "quest_000001",
    name: "Collect Linen Cloth",
    description: "Collect linen cloth for the town tailor.",
    issuerType: "NPC",
    issuerId: "npc_000001",
    type: "commission",
    quality: "common",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      { objectiveId: "collect-linen", type: "COLLECT", targetId: "item_000002", requiredCount: 2 },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 3,
    unique: false,
  },
  quest_000002: {
    questId: "quest_000002",
    name: "Defeat Forest Wolf",
    description: "Defeat a forest wolf threatening the road.",
    issuerType: "NPC",
    issuerId: "npc_000001",
    type: "bounty",
    quality: "excellent",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      { objectiveId: "defeat-wolf", type: "DEFEAT", targetId: "npc_000002", requiredCount: 1 },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 999_999,
    unique: false,
  },
  quest_000003: {
    questId: "quest_000003",
    name: "Explore Ancient Ruins",
    description: "Find the entrance to the ancient ruins.",
    issuerType: "EVENT",
    issuerId: "event_000003",
    type: "hidden",
    quality: "rare",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      {
        objectiveId: "explore-ruins",
        type: "EXPLORE",
        targetId: "region_000001",
        requiredCount: 1,
      },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 999_999,
    unique: true,
  },
  quest_000004: {
    questId: "quest_000004",
    name: "Survey the Hill",
    description: "Survey the hill near the wilderness road.",
    issuerType: "LOCATION",
    issuerId: "region_000001",
    type: "explore",
    quality: "common",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      { objectiveId: "explore-hill", type: "EXPLORE", targetId: "region_000001", requiredCount: 1 },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 999_999,
    unique: false,
  },
  quest_000005: {
    questId: "quest_000005",
    name: "Investigate the Shrine",
    description: "Investigate the shrine beside the old road.",
    issuerType: "LOCATION",
    issuerId: "region_000001",
    type: "explore",
    quality: "common",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      {
        objectiveId: "investigate-shrine",
        type: "INVESTIGATE",
        targetId: "region_000001",
        requiredCount: 1,
      },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 999_999,
    unique: false,
  },
} as const satisfies QuestDefinitionCatalog;

/** 创建一条可领取任务并返回对应玩家任务栏。 */
function createOfferedQuest(questId = "quest_000001") {
  return offerQuest(createPlayerQuestState("player_a"), QUEST_CATALOG, "quest-instance-1", questId);
}

describe("player quest lifecycle", () => {
  it("领取任务并在匹配进度事件后转换为已完成", () => {
    const accepted = acceptQuest(
      createOfferedQuest(),
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const completed = applyQuestProgressEvent(
      accepted,
      QUEST_CATALOG,
      {
        type: "COLLECT",
        targetId: "item_000002",
        count: 2,
      },
      8,
    );

    expect(completed.quests[0]).toMatchObject({
      status: "COMPLETED",
      acceptedAtTurn: 0,
      completedAtTurn: 8,
      rewardState: "NOT_GENERATED",
      objectiveProgresses: [{ objectiveId: "collect-linen", currentCount: 2 }],
    });
  });

  it("领取奖励时移除任务并只生成中立奖励指令", () => {
    const accepted = acceptQuest(
      createOfferedQuest(),
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const completed = applyQuestProgressEvent(accepted, QUEST_CATALOG, {
      type: "COLLECT",
      targetId: "item_000002",
      count: 2,
    });
    const rewardsGenerated = generateQuestRewardResults(
      completed,
      QUEST_CATALOG,
      QUEST_REWARD_POOLS,
      createQuestRewardStream(),
      "quest-instance-1",
    );
    const result = claimQuestRewards(
      rewardsGenerated,
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );

    expect(result.state.quests).toEqual([]);
    expect(result.state.history).toEqual([
      expect.objectContaining({ status: "CLAIMED", endedAtTurn: 0 }),
    ]);
    expect(result.rewardInstructions).toEqual([
      expect.objectContaining({ type: "COIN", amount: 3 }),
      expect.objectContaining({ type: "EXPERIENCE", amount: 5 }),
    ]);
  });

  it("奖励生成完成后保持结果不变，重复生成不会额外消耗随机流", () => {
    const accepted = acceptQuest(
      createOfferedQuest(),
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const completed = applyQuestProgressEvent(accepted, QUEST_CATALOG, {
      type: "COLLECT",
      targetId: "item_000002",
      count: 2,
    });
    const stream = createQuestRewardStream();
    const generated = generateQuestRewardResults(
      completed,
      QUEST_CATALOG,
      QUEST_REWARD_POOLS,
      stream,
      "quest-instance-1",
    );
    const repeated = generateQuestRewardResults(
      generated,
      QUEST_CATALOG,
      QUEST_REWARD_POOLS,
      stream,
      "quest-instance-1",
    );

    expect(repeated).toBe(generated);
    expect(stream.exportState().callCount).toBe(0);
  });

  it("仅允许在所属玩家回合放弃未完成任务", () => {
    const accepted = acceptQuest(
      createOfferedQuest(),
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );

    expect(() => abandonQuest(accepted, QUEST_CATALOG, "quest-instance-1", false)).toThrow(
      "owner's turn",
    );
    const abandoned = abandonQuest(accepted, QUEST_CATALOG, "quest-instance-1", true, 9);
    expect(abandoned.quests).toEqual([]);
    expect(abandoned.history).toEqual([
      expect.objectContaining({ status: "ABANDONED", endedAtTurn: 9 }),
    ]);
  });

  it("在所属玩家回合结束时减少进行中任务的有效回合并移除到期任务", () => {
    const accepted = acceptQuest(
      createOfferedQuest(),
      QUEST_CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const oneTurnLater = advanceQuestDurations(accepted, QUEST_CATALOG);
    const twoTurnsLater = advanceQuestDurations(oneTurnLater, QUEST_CATALOG);
    const expired = advanceQuestDurations(twoTurnsLater, QUEST_CATALOG, 12);

    expect(oneTurnLater.quests[0]?.remainingTurns).toBe(2);
    expect(expired.quests).toEqual([]);
    expect(expired.history).toEqual([
      expect.objectContaining({ status: "EXPIRED", endedAtTurn: 12 }),
    ]);
  });

  it("领取条件不满足时拒绝将可领取任务转换为进行中", () => {
    const offered = createOfferedQuest();

    expect(() =>
      acceptQuest(
        offered,
        QUEST_CATALOG,
        createUniqueQuestRegistryState(),
        "quest-instance-1",
        { ownerId: "player_a", currentTurn: 3 },
        { isSatisfied: () => false },
      ),
    ).not.toThrow();

    const conditionalCatalog = {
      ...QUEST_CATALOG,
      quest_000001: {
        ...QUEST_CATALOG.quest_000001,
        acceptConditionIds: ["condition_000001"],
      },
    } as const satisfies QuestDefinitionCatalog;

    expect(() =>
      acceptQuest(
        offered,
        conditionalCatalog,
        createUniqueQuestRegistryState(),
        "quest-instance-1",
        { ownerId: "player_a", currentTurn: 3 },
        { isSatisfied: () => false },
      ),
    ).toThrow("accept conditions are not satisfied");
  });

  it("任意目标完成规则允许匹配其中一个目标后完成任务", () => {
    const anyObjectiveCatalog = {
      quest_000001: {
        ...QUEST_CATALOG.quest_000001,
        completionRule: "ANY",
        objectives: [
          {
            objectiveId: "collect-linen",
            type: "COLLECT",
            targetId: "item_000002",
            requiredCount: 2,
          },
          {
            objectiveId: "collect-herb",
            type: "COLLECT",
            targetId: "item_000003",
            requiredCount: 1,
          },
        ],
      },
    } as const satisfies QuestDefinitionCatalog;
    const accepted = acceptQuest(
      offerQuest(
        createPlayerQuestState("player_a"),
        anyObjectiveCatalog,
        "quest-instance-1",
        "quest_000001",
      ),
      anyObjectiveCatalog,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const completed = applyQuestProgressEvent(
      accepted,
      anyObjectiveCatalog,
      { type: "COLLECT", targetId: "item_000003", count: 1 },
      6,
    );

    expect(completed.quests[0]?.status).toBe("COMPLETED");
    expect(completed.quests[0]?.completedAtTurn).toBe(6);
  });

  it("任务栏最多允许四项进行中或已完成任务", () => {
    let state = createPlayerQuestState("player_a");
    const questIds = ["quest_000001", "quest_000002", "quest_000003", "quest_000004"] as const;

    for (const [index, questId] of questIds.entries()) {
      const questInstanceId = `quest-instance-${index + 1}`;
      state = offerQuest(state, QUEST_CATALOG, questInstanceId, questId);
      state = acceptQuest(state, QUEST_CATALOG, createUniqueQuestRegistryState(), questInstanceId);
    }

    const offeredFifth = offerQuest(state, QUEST_CATALOG, "quest-instance-5", "quest_000005");
    expect(() =>
      acceptQuest(
        offeredFifth,
        QUEST_CATALOG,
        createUniqueQuestRegistryState(),
        "quest-instance-5",
      ),
    ).toThrow("at most 4 active quests");
  });
});

/** 创建用于任务奖励生成测试的确定性随机流。 */
function createQuestRewardStream(): RandomStream {
  return RandomStream.create("quest", null, createRandomStreamSeed("0123456789abcdef"));
}
