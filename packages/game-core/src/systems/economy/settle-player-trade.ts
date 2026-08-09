import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import {
  findFirstAvailableBackpackPosition,
  getItemDefinition,
} from "../inventory/backpack-geometry.ts";
import { placeItemInBackpack, removeBackpackItem } from "../inventory/backpack-operations.ts";
import type { ItemInstance } from "../inventory/item-instance.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { canAffordCoin, receiveCoin, spendCoin } from "./coin.ts";
import type { PlayerTradeState } from "./player-trade-state.ts";

/** 描述完成元宝转移时由上层分配的新物品实例标识。 */
export interface PlayerTradeCoinInstanceIds {
  readonly initiatorReceiptIds: readonly string[];
  readonly recipientReceiptIds: readonly string[];
}

/** 描述完成交易后双方背包和交易状态的不可变快照。 */
export interface SettlePlayerTradeResult {
  readonly trade: PlayerTradeState;
  readonly initiatorInventory: PlayerInventoryState;
  readonly recipientInventory: PlayerInventoryState;
}

/**
 * 方法名：settleConfirmedPlayerTrade
 * 作用：在双方确认后原子交换正式背包物品与元宝，临时拾取区不参与本次结算。
 * @param trade 已由双方确认且尚未结算的交易状态。
 * @param initiatorInventory 发起方的当前背包状态。
 * @param recipientInventory 接收方的当前背包状态。
 * @param coinInstanceIds 接收元宝时可使用的新元宝物品实例标识。
 * @param definitions 物品定义配置表。
 * @returns 已结算交易以及双方更新后的背包状态。
 * @throws 交易未确认、报价内容失效、余额不足或任一方背包无法容纳时抛出错误。
 */
export function settleConfirmedPlayerTrade(
  trade: PlayerTradeState,
  initiatorInventory: PlayerInventoryState,
  recipientInventory: PlayerInventoryState,
  coinInstanceIds: PlayerTradeCoinInstanceIds,
  definitions: ItemDefinitionCatalog,
): SettlePlayerTradeResult {
  validateSettlementInput(trade, initiatorInventory, recipientInventory, coinInstanceIds);

  const initiatorWithoutItems = removeOfferedItems(
    initiatorInventory,
    trade.initiatorOffer.itemInstanceIds,
    definitions,
  );
  const recipientWithoutItems = removeOfferedItems(
    recipientInventory,
    trade.recipientOffer.itemInstanceIds,
    definitions,
  );
  const initiatorAfterPayment = spendTradeCoin(
    initiatorWithoutItems.inventory,
    trade.initiatorOffer.coin,
    trade.tradeId,
  );
  const recipientAfterPayment = spendTradeCoin(
    recipientWithoutItems.inventory,
    trade.recipientOffer.coin,
    trade.tradeId,
  );
  const initiatorWithItems = receiveTransferredItems(
    initiatorAfterPayment,
    recipientWithoutItems.items,
    trade.initiatorId,
    definitions,
  );
  const recipientWithItems = receiveTransferredItems(
    recipientAfterPayment,
    initiatorWithoutItems.items,
    trade.recipientId,
    definitions,
  );
  const initiatorAfterCoinReceipt = receiveTradeCoin(
    initiatorWithItems,
    trade.recipientOffer.coin,
    trade.tradeId,
    coinInstanceIds.initiatorReceiptIds,
    definitions,
  );
  const recipientAfterCoinReceipt = receiveTradeCoin(
    recipientWithItems,
    trade.initiatorOffer.coin,
    trade.tradeId,
    coinInstanceIds.recipientReceiptIds,
    definitions,
  );

  return Object.freeze({
    trade: Object.freeze({ ...trade, status: "SETTLED" }),
    initiatorInventory: initiatorAfterCoinReceipt,
    recipientInventory: recipientAfterCoinReceipt,
  });
}

/** 校验参与者、交易状态和元宝实例标识的基本合法性。 */
function validateSettlementInput(
  trade: PlayerTradeState,
  initiatorInventory: PlayerInventoryState,
  recipientInventory: PlayerInventoryState,
  coinInstanceIds: PlayerTradeCoinInstanceIds,
): void {
  if (trade.status !== "CONFIRMED") {
    throw new Error("Only confirmed player trades can be settled");
  }

  if (!trade.initiatorConfirmed || !trade.recipientConfirmed) {
    throw new Error("Both participants must confirm before settlement");
  }

  assertInventoryOwner(initiatorInventory, trade.initiatorId, "initiator");
  assertInventoryOwner(recipientInventory, trade.recipientId, "recipient");
  assertDistinctIds(coinInstanceIds.initiatorReceiptIds, "initiatorReceiptIds");
  assertDistinctIds(coinInstanceIds.recipientReceiptIds, "recipientReceiptIds");
  assertNoCrossOfferDuplicates(trade);
}

/** 从正式背包中移除报价物品，并拒绝将元宝作为普通物品报价。 */
function removeOfferedItems(
  inventory: PlayerInventoryState,
  itemInstanceIds: readonly string[],
  definitions: ItemDefinitionCatalog,
): { readonly inventory: PlayerInventoryState; readonly items: readonly ItemInstance[] } {
  let backpack = inventory.backpack;
  const items: ItemInstance[] = [];

  for (const itemInstanceId of itemInstanceIds) {
    const removed = removeBackpackItem(backpack, itemInstanceId);

    if (removed.item.definitionId === COIN_ITEM_DEFINITION_ID) {
      throw new Error("Coin must be offered through the coin field");
    }

    getItemDefinition(definitions, removed.item.definitionId);
    backpack = removed.backpack;
    items.push(removed.item);
  }

  return { inventory: { ...inventory, backpack }, items: Object.freeze(items) };
}

/** 扣除交易报价中的元宝，并在余额不足时拒绝整笔交易。 */
function spendTradeCoin(
  inventory: PlayerInventoryState,
  quantity: number,
  tradeId: string,
): PlayerInventoryState {
  if (!canAffordCoin(inventory, quantity)) {
    throw new RangeError(`Player cannot afford ${quantity} Coin for trade ${tradeId}`);
  }

  return spendCoin(inventory, { coinQuantity: quantity, reasonId: tradeId }).inventory;
}

/** 将移除后的完整物品实例转移给接收方，并自动寻找第一个合法背包位置。 */
function receiveTransferredItems(
  inventory: PlayerInventoryState,
  items: readonly ItemInstance[],
  receivingPlayerId: PlayerId,
  definitions: ItemDefinitionCatalog,
): PlayerInventoryState {
  let backpack = inventory.backpack;

  for (const item of items) {
    const definition = getItemDefinition(definitions, item.definitionId);
    const position = findTransferPosition(backpack, definition, definitions, item.instanceId);

    if (position === null) {
      throw new Error(`Insufficient backpack space for traded item ${item.instanceId}`);
    }

    backpack = placeItemInBackpack(
      backpack,
      { ...item, ownerPlayerId: receivingPlayerId },
      position,
      definitions,
    );
  }

  return { ...inventory, backpack };
}

/** 接收对方支付的元宝，且禁止交易流程将元宝写入临时拾取区。 */
function receiveTradeCoin(
  inventory: PlayerInventoryState,
  quantity: number,
  tradeId: string,
  newItemInstanceIds: readonly string[],
  definitions: ItemDefinitionCatalog,
): PlayerInventoryState {
  if (quantity === 0) {
    return inventory;
  }

  const receipt = receiveCoin(
    inventory,
    {
      quantity,
      sourceId: tradeId,
      newItemInstanceIds,
      allowTemporaryStorage: false,
    },
    definitions,
  );

  if (receipt.temporaryQuantityAdded !== 0 || receipt.unresolvedItems.length !== 0) {
    throw new Error("Insufficient backpack space for traded Coin");
  }

  return receipt.inventory;
}

/** 查找可放置转移物品的位置，避免为交易增加独立的空间规则。 */
function findTransferPosition(
  backpack: PlayerInventoryState["backpack"],
  definition: ReturnType<typeof getItemDefinition>,
  definitions: ItemDefinitionCatalog,
  itemInstanceId: string,
): { readonly x: number; readonly y: number } | null {
  const position = findFirstAvailableBackpackPosition(backpack, definition, definitions);

  if (position === null) {
    return null;
  }

  if (backpack.entries.some((entry) => entry.item.instanceId === itemInstanceId)) {
    throw new Error(`Duplicate traded item instance: ${itemInstanceId}`);
  }

  return position;
}

/** 校验背包状态确实属于交易中声明的参与者。 */
function assertInventoryOwner(
  inventory: PlayerInventoryState,
  expectedPlayerId: PlayerId,
  role: string,
): void {
  if (inventory.backpack.playerId !== expectedPlayerId) {
    throw new Error(`${role} inventory does not belong to the trade participant`);
  }
}

/** 校验新建元宝实例标识在本次接收集合内不重复。 */
function assertDistinctIds(instanceIds: readonly string[], field: string): void {
  const uniqueIds = new Set<string>();

  for (const instanceId of instanceIds) {
    if (instanceId.trim().length === 0) {
      throw new TypeError(`${field} must not contain empty item instance ids`);
    }

    if (uniqueIds.has(instanceId)) {
      throw new Error(`${field} must not contain duplicate item instance ids`);
    }

    uniqueIds.add(instanceId);
  }
}

/** 校验双方报价不会引用同一个物品实例。 */
function assertNoCrossOfferDuplicates(trade: PlayerTradeState): void {
  const offeredItemIds = new Set(trade.initiatorOffer.itemInstanceIds);

  for (const itemInstanceId of trade.recipientOffer.itemInstanceIds) {
    if (offeredItemIds.has(itemInstanceId)) {
      throw new Error(
        `A traded item instance cannot be offered by both players: ${itemInstanceId}`,
      );
    }
  }
}
