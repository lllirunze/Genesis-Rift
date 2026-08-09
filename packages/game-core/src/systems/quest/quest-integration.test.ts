import { describe, expect, it } from "vitest";

import type { ReceiveItemResult } from "../inventory/receive-item.ts";
import type { BattleSettlement } from "../battle/settlement/battle-settlement.ts";
import type { ResolvedEventInstance } from "../event/event-instance.ts";
import type { SuccessfulTileEntryResult } from "../map/exploration/player-exploration-state.ts";
import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import {
  applyQuestOfferInstruction,
  createQuestProgressEventFromBattleDefeat,
  createQuestProgressEventFromFirstExploration,
  createQuestProgressEventFromItemReceipt,
  createQuestProgressEventFromResolvedEvent,
  createQuestRewardDispatchInstructions,
  executeQuestRewardDispatchInstructions,
  type QuestDefinitionCatalog,
  type QuestRewardPoolCatalog,
} from "./index.ts";
import {
  acceptQuest,
  applyQuestProgressEvent,
  claimQuestRewards,
  createPlayerQuestState,
  createUniqueQuestRegistryState,
  generateQuestRewardResults,
} from "./quest-runtime-state.ts";

const REWARD_POOLS = {
  reward_000001: {
    rewardPoolId: "reward_000001",
    fixedRewards: [
      { rewardId: "coin", type: "COIN", targetId: null, amount: 5 },
      { rewardId: "experience", type: "EXPERIENCE", targetId: null, amount: 10 },
    ],
    randomRewards: [],
    randomDrawCount: 0,
  },
} as const satisfies QuestRewardPoolCatalog;

const CATALOG = {
  quest_000001: {
    questId: "quest_000001",
    name: "Collect Cloth",
    description: "Collect cloth for the tailor.",
    issuerType: "NPC",
    issuerId: "npc_000001",
    type: "commission",
    quality: "common",
    triggerConditionIds: [],
    acceptConditionIds: [],
    objectives: [
      { objectiveId: "cloth", type: "COLLECT", targetId: "item_000002", requiredCount: 2 },
    ],
    completionRule: "ALL",
    rewardPoolId: "reward_000001",
    durationTurns: 10,
    unique: false,
  },
} as const satisfies QuestDefinitionCatalog;

describe("quest integration", () => {
  it("从任务提供、物品接收、进度完成到奖励分发保持统一流程", () => {
    const offered = applyQuestOfferInstruction(createPlayerQuestState("player_a"), CATALOG, {
      questInstanceId: "quest-instance-1",
      ownerId: "player_a",
      questId: "quest_000001",
      sourceType: "NPC",
      sourceId: "npc_000001",
    });
    const accepted = acceptQuest(
      offered,
      CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const progress = createQuestProgressEventFromItemReceipt("item_000002", createReceipt(2));
    const completed = applyQuestProgressEvent(accepted, CATALOG, progress!);
    const rewardsGenerated = generateQuestRewardResults(
      completed,
      CATALOG,
      REWARD_POOLS,
      createQuestRewardStream(),
      "quest-instance-1",
    );
    const claimed = claimQuestRewards(
      rewardsGenerated,
      CATALOG,
      createUniqueQuestRegistryState(),
      "quest-instance-1",
    );
    const result = executeQuestRewardDispatchInstructions(
      { coin: 0, experience: 0 },
      createQuestRewardDispatchInstructions(claimed.rewardInstructions),
      {
        ECONOMY: {
          channel: "ECONOMY",
          execute: (state, reward) => ({ ...state, coin: state.coin + reward.amount }),
        },
        LEVEL: {
          channel: "LEVEL",
          execute: (state, reward) => ({ ...state, experience: state.experience + reward.amount }),
        },
      },
    );

    expect(claimed.state.quests).toEqual([]);
    expect(result).toEqual({ coin: 5, experience: 10 });
  });

  it("没有成功存放的物品不会推进收集任务", () => {
    expect(createQuestProgressEventFromItemReceipt("item_000002", createReceipt(0))).toBeNull();
  });

  it("只为正式死亡、首次探索和已结算事件生成对应任务进度", () => {
    expect(
      createQuestProgressEventFromBattleDefeat(createBattleSettlement("DEAD"), "npc_000002"),
    ).toEqual({
      type: "DEFEAT",
      targetId: "npc_000002",
      count: 1,
    });
    expect(
      createQuestProgressEventFromBattleDefeat(createBattleSettlement("DOWNED"), "npc_000002"),
    ).toBeNull();
    expect(createQuestProgressEventFromFirstExploration(createExplorationResult(true))).toEqual({
      type: "EXPLORE",
      targetId: "tile_001",
      count: 1,
    });
    expect(createQuestProgressEventFromFirstExploration(createExplorationResult(false))).toBeNull();
    expect(createQuestProgressEventFromResolvedEvent(createResolvedEvent())).toEqual({
      type: "INVESTIGATE",
      targetId: "event_000003",
      count: 1,
    });
  });

  it("缺少奖励通道处理器时拒绝静默跳过奖励", () => {
    expect(() =>
      executeQuestRewardDispatchInstructions(
        { coin: 0 },
        createQuestRewardDispatchInstructions([
          {
            questInstanceId: "quest-instance-1",
            questId: "quest_000001",
            ownerId: "player_a",
            rewardId: "hand-card",
            type: "HAND_CARD",
            targetId: "card_000001",
            amount: 1,
          },
        ]),
        {},
      ),
    ).toThrow("Missing quest reward handler for channel: HAND");
  });
});

/** 创建仅用于收集进度适配测试的物品接收结果。 */
function createReceipt(quantity: number): ReceiveItemResult {
  return {
    inventory: {} as ReceiveItemResult["inventory"],
    backpackQuantityAdded: quantity,
    temporaryQuantityAdded: 0,
    unresolvedItems: [],
  };
}

/** 创建仅包含任务进度适配所需字段的战斗结算结果。 */
function createBattleSettlement(status: "DOWNED" | "DEAD"): BattleSettlement {
  return {
    defenderSurvival: { participantId: "npc_runtime_1", status, downedTurnsRemaining: 0 },
  } as BattleSettlement;
}

/** 创建仅包含任务进度适配所需字段的地图探索结果。 */
function createExplorationResult(isFirstExploration: boolean): SuccessfulTileEntryResult {
  return { enteredTileId: "tile_001", isFirstExploration } as SuccessfulTileEntryResult;
}

/** 创建仅包含任务进度适配所需字段的已结算事件实例。 */
function createResolvedEvent(): ResolvedEventInstance {
  return { eventId: "event_000003" } as ResolvedEventInstance;
}

/** 创建用于任务奖励生成测试的确定性随机流。 */
function createQuestRewardStream(): RandomStream {
  return RandomStream.create("quest", null, createRandomStreamSeed("0123456789abcdef"));
}
