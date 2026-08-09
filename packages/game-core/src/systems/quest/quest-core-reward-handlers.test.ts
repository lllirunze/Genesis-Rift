import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { CharacterState } from "../character/character-state.ts";
import { getCoinBalance } from "../economy/coin.ts";
import { createHandCardDeckState } from "../hand/hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "../hand/hand-card-definition.ts";
import { createPlayerHandState } from "../hand/player-hand-state.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { RandomManager } from "../random/core/random-manager.ts";
import { createMasterSeed } from "../random/core/random-seed.ts";

import { createQuestRewardDispatchInstructions } from "./quest-reward-dispatch.ts";
import {
  executeQuestCoreRewardInstructions,
  type QuestCoreRewardState,
} from "./quest-core-reward-handlers.ts";

const PLAYER_ID = "player_a" as PlayerId;

const ITEM_DEFINITIONS = {
  item_000001: {
    definitionId: "item_000001",
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000002: {
    definitionId: "item_000002",
    name: "Linen Cloth",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const;

const HAND_CARD_ID = "card_000001" as HandCardId;
const HAND_CARD_CATALOG = {
  [HAND_CARD_ID]: {
    cardId: HAND_CARD_ID,
    name: "sprint",
    description: "Improve one movement action.",
    quality: "common",
    type: "action",
    usage: {
      timing: "active",
      responseTypes: [],
      conditionIds: ["player.canMove"],
      targetTypes: ["player"],
    },
    effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
    destinationAfterResolution: "discard",
  },
} as const satisfies HandCardCatalog;

const HAND_REWARD_RANDOM_STREAM = RandomManager.create(
  createMasterSeed("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"),
).getStream("deck", "quest-reward-deck");

/** 创建包含任务奖励所需最小角色和背包状态的测试聚合。 */
function createState(): QuestCoreRewardState {
  return {
    character: {
      playerId: PLAYER_ID,
      levelProgression: { currentLevel: 1, currentExperience: 0 },
    } as CharacterState,
    inventory: createPlayerInventory(PLAYER_ID),
  };
}

describe("quest core reward handlers", () => {
  it("将元宝奖励作为 Coin 物品写入背包，并将经验奖励写入角色经验", () => {
    const state = executeQuestCoreRewardInstructions(
      createState(),
      createQuestRewardDispatchInstructions([
        {
          questInstanceId: "quest-instance-1",
          questId: "quest_000001",
          ownerId: PLAYER_ID,
          rewardId: "coin",
          type: "COIN",
          targetId: null,
          amount: 7,
        },
        {
          questInstanceId: "quest-instance-1",
          questId: "quest_000001",
          ownerId: PLAYER_ID,
          rewardId: "experience",
          type: "EXPERIENCE",
          targetId: null,
          amount: 10,
        },
      ]),
      {
        itemDefinitions: ITEM_DEFINITIONS,
        createItemInstanceIds: (_reward, count) =>
          Array.from({ length: count }, (_value, index) => `coin-instance-${index + 1}`),
      },
    );

    expect(getCoinBalance(state.inventory)).toBe(7);
    expect(state.character.levelProgression.currentExperience).toBe(10);
  });

  it("将物品奖励通过统一背包流程写入玩家背包", () => {
    const state = executeQuestCoreRewardInstructions(
      createState(),
      createQuestRewardDispatchInstructions([
        {
          questInstanceId: "quest-instance-1",
          questId: "quest_000001",
          ownerId: PLAYER_ID,
          rewardId: "item",
          type: "ITEM",
          targetId: "item_000002",
          amount: 2,
        },
      ]),
      {
        itemDefinitions: ITEM_DEFINITIONS,
        createItemInstanceIds: () => ["linen-instance-1"],
      },
    );

    expect(state.inventory.backpack.entries).toEqual([
      expect.objectContaining({
        item: expect.objectContaining({ definitionId: "item_000002", quantity: 2 }),
      }),
    ]);
  });

  it("从共享牌库随机抽取任务奖励手牌，而不是定向获得指定手牌", () => {
    const state = executeQuestCoreRewardInstructions(
      {
        ...createState(),
        handCardDeckState: createHandCardDeckState(
          "quest-reward-deck",
          [HAND_CARD_ID],
          HAND_CARD_CATALOG,
        ),
        playerHandState: createPlayerHandState(PLAYER_ID),
      },
      createQuestRewardDispatchInstructions([
        {
          questInstanceId: "quest-instance-1",
          questId: "quest_000001",
          ownerId: PLAYER_ID,
          rewardId: "hand-card",
          type: "HAND_CARD",
          targetId: null,
          amount: 1,
        },
      ]),
      {
        itemDefinitions: ITEM_DEFINITIONS,
        createItemInstanceIds: () => [],
        handReward: {
          handCardCatalog: HAND_CARD_CATALOG,
          randomStream: HAND_REWARD_RANDOM_STREAM,
        },
      },
    );

    expect(state.playerHandState?.handCardIds).toEqual([HAND_CARD_ID]);
    expect(state.handCardDeckState?.drawPile).toEqual([]);
  });

  it("未实现的手牌奖励通道会明确失败而不是静默忽略", () => {
    expect(() =>
      executeQuestCoreRewardInstructions(
        createState(),
        createQuestRewardDispatchInstructions([
          {
            questInstanceId: "quest-instance-1",
            questId: "quest_000001",
            ownerId: PLAYER_ID,
            rewardId: "hand-card",
            type: "HAND_CARD",
            targetId: "card_000001",
            amount: 1,
          },
        ]),
        { itemDefinitions: ITEM_DEFINITIONS, createItemInstanceIds: () => [] },
      ),
    ).toThrow("Missing quest reward handler for channel: HAND");
  });
});
