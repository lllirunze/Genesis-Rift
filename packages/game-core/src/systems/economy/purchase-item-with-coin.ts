import { COIN_ITEM_DEFINITION_ID, type ItemDefinitionCatalog } from "@genesis-rift/shared";

import { getItemDefinition } from "../inventory/backpack-geometry.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import { canAffordCoin, getCoinBalance, spendCoin, type CoinPaymentRecord } from "./coin.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface PurchaseItemWithCoinInput {
  readonly transactionId: string;
  readonly itemDefinitionId: string;
  readonly itemQuantity: number;
  readonly totalCoinPrice: number;
  readonly newItemInstanceIds: readonly string[];
  readonly stackCompatibilityKey?: string;
}

/** 描述业务操作完成后返回的结果。 */
export type PurchaseItemWithCoinResult =
  | {
      readonly purchased: true;
      readonly inventory: PlayerInventoryState;
      readonly transactionId: string;
      readonly itemDefinitionId: string;
      readonly purchasedQuantity: number;
      readonly totalCoinPrice: number;
      readonly previousCoinBalance: number;
      readonly currentCoinBalance: number;
      readonly payment: CoinPaymentRecord;
      readonly receivedItemInstanceIds: readonly string[];
    }
  | {
      readonly purchased: false;
      readonly inventory: PlayerInventoryState;
      readonly transactionId: string;
      readonly itemDefinitionId: string;
      readonly requestedQuantity: number;
      readonly totalCoinPrice: number;
      readonly previousCoinBalance: number;
      readonly reason: "insufficient-coin";
      readonly missingCoinQuantity: number;
    }
  | {
      readonly purchased: false;
      readonly inventory: PlayerInventoryState;
      readonly transactionId: string;
      readonly itemDefinitionId: string;
      readonly requestedQuantity: number;
      readonly totalCoinPrice: number;
      readonly previousCoinBalance: number;
      readonly reason: "insufficient-backpack-space";
      readonly unstoredItemQuantity: number;
    };

/**
 * 方法名：purchaseItemWithCoin
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param input 本次处理的输入数据。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function purchaseItemWithCoin(
  inventory: PlayerInventoryState,
  input: PurchaseItemWithCoinInput,
  definitions: ItemDefinitionCatalog,
): PurchaseItemWithCoinResult {
  validateInput(input);
  const itemDefinition = getItemDefinition(definitions, input.itemDefinitionId);

  if (itemDefinition.definitionId === COIN_ITEM_DEFINITION_ID) {
    throw new Error("Coin cannot be purchased with Coin");
  }

  const previousCoinBalance = getCoinBalance(inventory);

  if (!canAffordCoin(inventory, input.totalCoinPrice)) {
    return Object.freeze({
      purchased: false,
      inventory,
      transactionId: input.transactionId,
      itemDefinitionId: input.itemDefinitionId,
      requestedQuantity: input.itemQuantity,
      totalCoinPrice: input.totalCoinPrice,
      previousCoinBalance,
      reason: "insufficient-coin",
      missingCoinQuantity: input.totalCoinPrice - previousCoinBalance,
    });
  }

  const payment = spendCoin(inventory, {
    coinQuantity: input.totalCoinPrice,
    reasonId: input.transactionId,
  });
  const receipt = receiveItem(
    payment.inventory,
    {
      definitionId: input.itemDefinitionId,
      quantity: input.itemQuantity,
      sourceId: input.transactionId,
      newItemInstanceIds: input.newItemInstanceIds,
      allowTemporaryStorage: false,
      ...(input.stackCompatibilityKey === undefined
        ? {}
        : { stackCompatibilityKey: input.stackCompatibilityKey }),
    },
    definitions,
  );
  const unresolvedQuantity = receipt.unresolvedItems.reduce(
    (total, unresolved) => addSafeIntegers(total, unresolved.item.quantity),
    0,
  );
  const storedQuantity = addSafeIntegers(
    receipt.backpackQuantityAdded,
    receipt.temporaryQuantityAdded,
  );

  if (
    storedQuantity !== input.itemQuantity ||
    receipt.temporaryQuantityAdded !== 0 ||
    unresolvedQuantity !== 0
  ) {
    return Object.freeze({
      purchased: false,
      inventory,
      transactionId: input.transactionId,
      itemDefinitionId: input.itemDefinitionId,
      requestedQuantity: input.itemQuantity,
      totalCoinPrice: input.totalCoinPrice,
      previousCoinBalance,
      reason: "insufficient-backpack-space",
      unstoredItemQuantity: input.itemQuantity - receipt.backpackQuantityAdded,
    });
  }

  const previousItemInstanceIds = new Set(
    payment.inventory.backpack.entries.map((entry) => entry.item.instanceId),
  );
  const receivedItemInstanceIds = receipt.inventory.backpack.entries.flatMap((entry) =>
    entry.item.definitionId === input.itemDefinitionId &&
    !previousItemInstanceIds.has(entry.item.instanceId)
      ? [entry.item.instanceId]
      : [],
  );

  return Object.freeze({
    purchased: true,
    inventory: receipt.inventory,
    transactionId: input.transactionId,
    itemDefinitionId: input.itemDefinitionId,
    purchasedQuantity: input.itemQuantity,
    totalCoinPrice: input.totalCoinPrice,
    previousCoinBalance,
    currentCoinBalance: payment.remainingBalance,
    payment: payment.payment,
    receivedItemInstanceIds: Object.freeze(receivedItemInstanceIds),
  });
}

/**
 * 方法名：validateInput
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param input 本次处理的输入数据。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateInput(input: PurchaseItemWithCoinInput): void {
  assertNonEmptyString(input.transactionId, "transactionId");
  assertNonEmptyString(input.itemDefinitionId, "itemDefinitionId");
  assertPositiveSafeInteger(input.itemQuantity, "itemQuantity");
  assertNonNegativeSafeInteger(input.totalCoinPrice, "totalCoinPrice");

  if (input.stackCompatibilityKey !== undefined) {
    assertNonEmptyString(input.stackCompatibilityKey, "stackCompatibilityKey");
  }
}

/**
 * 方法名：addSafeIntegers
 * 作用：在保持既有约束的前提下添加目标数据。
 * @param first 方法所需的 first 参数。
 * @param second 方法所需的 second 参数。
 * @returns 本次处理得到的结果。
 */
function addSafeIntegers(first: number, second: number): number {
  const result = first + second;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Purchase item quantity exceeds the safe integer range");
  }

  return result;
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
