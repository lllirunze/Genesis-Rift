import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import type { CharacterState } from "../character/character-state.ts";
import { receiveCoin } from "../economy/coin.ts";
import { acquireHandCardsFromSharedDeck } from "../hand/acquire-hand-cards.ts";
import type { HandCardDeckState } from "../hand/hand-card-deck-state.ts";
import type { HandCardCatalog } from "../hand/hand-card-definition.ts";
import type { PlayerHandState } from "../hand/player-hand-state.ts";
import { grantCharacterExperience } from "../level/grant-character-experience.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import type { RandomStream } from "../random/core/random-stream.ts";
import { receiveItem, type ReceiveItemResult } from "../inventory/receive-item.ts";

import {
  executeQuestRewardDispatchInstructions,
  type QuestRewardDispatchHandler,
  type QuestRewardDispatchInstruction,
  type QuestRewardHandlerRegistry,
} from "./quest-reward-dispatch.ts";
import type { QuestRewardInstruction } from "./quest-runtime-state.ts";

/** 描述当前阶段可由任务系统直接处理的角色与背包聚合状态。 */
export interface QuestCoreRewardState {
  readonly character: CharacterState;
  readonly inventory: PlayerInventoryState;
  readonly handCardDeckState?: HandCardDeckState;
  readonly playerHandState?: PlayerHandState;
}

/** 描述执行元宝任务奖励所需的物品配置与实例标识分配依赖。 */
export interface QuestCoreRewardDependencies {
  readonly itemDefinitions: ItemDefinitionCatalog;
  createItemInstanceIds(reward: QuestRewardInstruction, requestedCount: number): readonly string[];
  readonly handReward?: QuestHandRewardDependencies;
}

/** 描述从共享牌库执行任务手牌奖励所需的定义与随机流依赖。 */
export interface QuestHandRewardDependencies {
  readonly handCardCatalog: HandCardCatalog;
  readonly randomStream: RandomStream;
}

/**
 * 方法名：createQuestCoreRewardHandlerRegistry
 * 作用：创建能实际执行元宝、经验、物品以及可选手牌任务奖励的处理器注册表。
 * @param dependencies 元宝入背包所需的物品定义与物品实例标识分配依赖。
 * @returns 仅注册 ECONOMY 与 LEVEL 通道的不可变奖励处理器注册表。
 */
export function createQuestCoreRewardHandlerRegistry(
  dependencies: QuestCoreRewardDependencies,
): QuestRewardHandlerRegistry<QuestCoreRewardState> {
  const baseRegistry = {
    ECONOMY: createCoinRewardHandler(dependencies),
    LEVEL: createExperienceRewardHandler(),
    INVENTORY: createItemRewardHandler(dependencies),
  };

  return Object.freeze(
    dependencies.handReward === undefined
      ? baseRegistry
      : { ...baseRegistry, HAND: createHandCardRewardHandler(dependencies.handReward) },
  );
}

/**
 * 方法名：executeQuestCoreRewardInstructions
 * 作用：使用任务核心奖励处理器执行元宝与经验分发指令，并返回更新后的角色与背包状态。
 * @param state 当前角色与背包聚合状态。
 * @param instructions 已由任务奖励生成的分发指令。
 * @param dependencies 元宝入背包所需的物品定义与物品实例标识分配依赖。
 * @returns 执行全部支持奖励后的不可变角色与背包聚合状态。
 * @throws 奖励包含尚未实现处理器的通道，或角色与背包不属于同一玩家时抛出错误。
 */
export function executeQuestCoreRewardInstructions(
  state: QuestCoreRewardState,
  instructions: readonly QuestRewardDispatchInstruction[],
  dependencies: QuestCoreRewardDependencies,
): QuestCoreRewardState {
  validateQuestCoreRewardState(state);
  return executeQuestRewardDispatchInstructions(
    state,
    instructions,
    createQuestCoreRewardHandlerRegistry(dependencies),
  );
}

/**
 * 方法名：validateQuestCoreRewardState
 * 作用：校验任务奖励操作中的角色与背包归属同一玩家。
 * @param state 需要校验的角色与背包聚合状态。
 * @returns 无返回值。
 * @throws 角色玩家标识与背包玩家标识不一致时抛出错误。
 */
export function validateQuestCoreRewardState(state: QuestCoreRewardState): void {
  if (state.character.playerId !== state.inventory.backpack.playerId) {
    throw new Error("Quest reward character and inventory must belong to the same player");
  }

  if ((state.handCardDeckState === undefined) !== (state.playerHandState === undefined)) {
    throw new Error("Quest hand reward state requires both deck and player hand states");
  }

  if (
    state.playerHandState !== undefined &&
    state.playerHandState.playerId !== state.character.playerId
  ) {
    throw new Error("Quest reward character and hand must belong to the same player");
  }
}

/** 创建将 COIN 奖励写入背包中元宝物品的经济通道处理器。 */
function createCoinRewardHandler(
  dependencies: QuestCoreRewardDependencies,
): QuestRewardDispatchHandler<QuestCoreRewardState> {
  return Object.freeze({
    channel: "ECONOMY",
    execute: (state: QuestCoreRewardState, reward: QuestRewardInstruction) => {
      if (reward.type !== "COIN") {
        throw new Error("ECONOMY quest reward handler only accepts COIN rewards");
      }

      if (reward.targetId !== null) {
        throw new Error("COIN quest rewards must not define a target id");
      }

      const inventory = receiveCoin(
        state.inventory,
        {
          quantity: reward.amount,
          sourceId: `quest.reward.${reward.questInstanceId}`,
          newItemInstanceIds: dependencies.createItemInstanceIds(reward, reward.amount),
        },
        dependencies.itemDefinitions,
      );
      assertReceiptResolved(inventory, reward);

      return Object.freeze({ ...state, inventory: inventory.inventory });
    },
  });
}

/** 创建将 ITEM 奖励通过统一物品接收流程写入背包的物品通道处理器。 */
function createItemRewardHandler(
  dependencies: QuestCoreRewardDependencies,
): QuestRewardDispatchHandler<QuestCoreRewardState> {
  return Object.freeze({
    channel: "INVENTORY",
    execute: (state: QuestCoreRewardState, reward: QuestRewardInstruction) => {
      if (reward.type !== "ITEM") {
        throw new Error("INVENTORY quest reward handler only accepts ITEM rewards");
      }

      if (reward.targetId === null) {
        throw new Error("ITEM quest rewards must define an item definition id");
      }

      const receipt = receiveItem(
        state.inventory,
        {
          definitionId: reward.targetId,
          quantity: reward.amount,
          sourceId: `quest.reward.${reward.questInstanceId}`,
          newItemInstanceIds: dependencies.createItemInstanceIds(reward, reward.amount),
        },
        dependencies.itemDefinitions,
      );
      assertReceiptResolved(receipt, reward);

      return Object.freeze({ ...state, inventory: receipt.inventory });
    },
  });
}

/** 创建从共享牌库随机抽取指定数量手牌的手牌通道处理器。 */
function createHandCardRewardHandler(
  dependencies: QuestHandRewardDependencies,
): QuestRewardDispatchHandler<QuestCoreRewardState> {
  return Object.freeze({
    channel: "HAND",
    execute: (state: QuestCoreRewardState, reward: QuestRewardInstruction) => {
      if (reward.type !== "HAND_CARD") {
        throw new Error("HAND quest reward handler only accepts HAND_CARD rewards");
      }

      if (reward.targetId !== null) {
        throw new Error(
          "HAND_CARD quest rewards must draw from the shared deck without a target id",
        );
      }

      if (state.handCardDeckState === undefined || state.playerHandState === undefined) {
        throw new Error("HAND_CARD quest rewards require shared deck and player hand states");
      }

      const availableCardCount =
        state.handCardDeckState.drawPile.length + state.handCardDeckState.discardPile.length;

      if (availableCardCount < reward.amount) {
        throw new Error(
          `Insufficient shared hand cards for quest reward: required ${reward.amount}, available ${availableCardCount}`,
        );
      }

      const result = acquireHandCardsFromSharedDeck(
        state.handCardDeckState,
        state.playerHandState,
        dependencies.handCardCatalog,
        dependencies.randomStream,
        { type: "questReward", sourceId: `quest.reward.${reward.questInstanceId}` },
        reward.amount,
      );

      if (!result.isComplete) {
        throw new Error("Shared hand card draw did not complete the quest reward");
      }

      return Object.freeze({
        ...state,
        handCardDeckState: result.deckState,
        playerHandState: result.playerHandState,
      });
    },
  });
}

/**
 * 方法名：assertReceiptResolved
 * 作用：确保任务奖励物品已全部进入背包或临时拾取区，不允许静默遗失未解决物品。
 * @param receipt 统一物品接收流程返回的结果。
 * @param reward 当前正在执行的任务奖励。
 * @returns 无返回值。
 * @throws 存在无法存放的奖励物品时抛出错误。
 */
function assertReceiptResolved(receipt: ReceiveItemResult, reward: QuestRewardInstruction): void {
  if (receipt.unresolvedItems.length > 0) {
    throw new Error(
      `Quest reward ${reward.rewardId} cannot be fully stored: ${receipt.unresolvedItems.length} unresolved item units`,
    );
  }
}

/** 创建将 EXPERIENCE 奖励写入角色经验进度的等级通道处理器。 */
function createExperienceRewardHandler(): QuestRewardDispatchHandler<QuestCoreRewardState> {
  return Object.freeze({
    channel: "LEVEL",
    execute: (state: QuestCoreRewardState, reward: QuestRewardInstruction) => {
      if (reward.type !== "EXPERIENCE") {
        throw new Error("LEVEL quest reward handler only accepts EXPERIENCE rewards");
      }

      if (reward.targetId !== null) {
        throw new Error("EXPERIENCE quest rewards must not define a target id");
      }

      return Object.freeze({
        ...state,
        character: grantCharacterExperience(state.character, reward.amount),
      });
    },
  });
}
