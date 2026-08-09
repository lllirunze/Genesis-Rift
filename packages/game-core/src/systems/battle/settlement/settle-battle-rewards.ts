import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import type { CharacterState } from "../../character/character-state.ts";
import { grantCharacterExperience } from "../../level/grant-character-experience.ts";
import { receiveCoin } from "../../economy/coin.ts";
import { receiveItem } from "../../inventory/receive-item.ts";
import type { PlayerInventoryState } from "../../inventory/player-inventory-state.ts";
import type { BattleSettlement } from "./battle-settlement.ts";

/** 描述击败目标后可以直接派发的确定物品奖励。 */
export interface BattleItemReward {
  readonly definitionId: string;
  readonly quantity: number;
}

/** 描述击败奖励的静态数值与物品组成。 */
export interface BattleRewardDefinition {
  readonly experience: number;
  readonly coin: number;
  readonly items: readonly BattleItemReward[];
}

/** 描述战斗奖励派发完成后的角色与背包状态。 */
export interface SettleBattleRewardsResult {
  readonly character: CharacterState;
  readonly inventory: PlayerInventoryState;
}

/**
 * 方法名：settleBattleRewards
 * 作用：在目标已经正式死亡时，以不可变快照原子派发经验、元宝和确定物品奖励。
 * @param settlement 已完成且目标已死亡的战斗结算。
 * @param character 获得奖励的攻击方角色状态。
 * @param inventory 获得奖励的攻击方背包状态。
 * @param reward 本次击败对应的静态奖励定义。
 * @param itemDefinitions 已加载的物品静态定义注册表。
 * @param createItemInstanceIds 为元宝和物品提供确定性实例标识的工厂。
 * @returns 奖励全部成功后的角色与背包最新状态。
 * @throws 目标未死亡、归属不一致、奖励非法或背包无法接收全部奖励时抛出错误。
 */
export function settleBattleRewards(
  settlement: BattleSettlement,
  character: CharacterState,
  inventory: PlayerInventoryState,
  reward: BattleRewardDefinition,
  itemDefinitions: ItemDefinitionCatalog,
  createItemInstanceIds: (definitionId: string, quantity: number) => readonly string[],
): SettleBattleRewardsResult {
  if (settlement.defenderSurvival.status !== "DEAD") {
    throw new Error("Battle rewards require the defender to be formally dead");
  }

  if (
    settlement.attack.context.attackerId !== character.playerId ||
    inventory.backpack.playerId !== character.playerId
  ) {
    throw new Error("Battle reward recipient states must belong to the attacker");
  }

  validateBattleRewardDefinition(reward);
  let nextInventory = inventory;

  if (reward.coin > 0) {
    const receivedCoin = receiveCoin(
      nextInventory,
      {
        quantity: reward.coin,
        sourceId: settlement.settlementId,
        newItemInstanceIds: createItemInstanceIds("item_000001", reward.coin),
      },
      itemDefinitions,
    );
    assertCompleteRewardReceipt(receivedCoin.unresolvedItems.length, "coin");
    nextInventory = receivedCoin.inventory;
  }

  for (const item of reward.items) {
    const receivedItem = receiveItem(
      nextInventory,
      {
        definitionId: item.definitionId,
        quantity: item.quantity,
        sourceId: settlement.settlementId,
        newItemInstanceIds: createItemInstanceIds(item.definitionId, item.quantity),
      },
      itemDefinitions,
    );
    assertCompleteRewardReceipt(receivedItem.unresolvedItems.length, item.definitionId);
    nextInventory = receivedItem.inventory;
  }

  return Object.freeze({
    character: grantCharacterExperience(character, reward.experience),
    inventory: nextInventory,
  });
}

/**
 * 方法名：validateBattleRewardDefinition
 * 作用：校验战斗奖励数值及物品条目不会重复或包含非法数量。
 * @param reward 需要校验的击败奖励定义。
 * @returns 无返回值。
 * @throws 奖励数值非负整数、物品标识为空或重复时抛出错误。
 */
export function validateBattleRewardDefinition(reward: BattleRewardDefinition): void {
  assertNonNegativeSafeInteger(reward.experience, "experience");
  assertNonNegativeSafeInteger(reward.coin, "coin");
  const itemIds = new Set<string>();

  for (const item of reward.items) {
    assertNonEmptyString(item.definitionId, "items.definitionId");
    assertPositiveSafeInteger(item.quantity, "items.quantity");

    if (itemIds.has(item.definitionId)) {
      throw new Error(`Duplicate battle reward item: ${item.definitionId}`);
    }

    itemIds.add(item.definitionId);
  }
}

/** 确保所有奖励内容都已经进入背包或合法临时拾取区。 */
function assertCompleteRewardReceipt(unresolvedItemCount: number, rewardId: string): void {
  if (unresolvedItemCount > 0) {
    throw new Error(`Battle reward cannot be fully received: ${rewardId}`);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
