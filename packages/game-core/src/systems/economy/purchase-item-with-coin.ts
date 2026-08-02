import { COIN_ITEM_DEFINITION_ID, type ItemDefinitionCatalog } from "@genesis-rift/shared";

import { getItemDefinition } from "../inventory/backpack-geometry.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import { canAffordCoin, getCoinBalance, spendCoin, type CoinPaymentRecord } from "./coin.ts";

export interface PurchaseItemWithCoinInput {
  readonly transactionId: string;
  readonly itemDefinitionId: string;
  readonly itemQuantity: number;
  readonly totalCoinPrice: number;
  readonly newItemInstanceIds: readonly string[];
  readonly stackCompatibilityKey?: string;
}

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

function validateInput(input: PurchaseItemWithCoinInput): void {
  assertNonEmptyString(input.transactionId, "transactionId");
  assertNonEmptyString(input.itemDefinitionId, "itemDefinitionId");
  assertPositiveSafeInteger(input.itemQuantity, "itemQuantity");
  assertNonNegativeSafeInteger(input.totalCoinPrice, "totalCoinPrice");

  if (input.stackCompatibilityKey !== undefined) {
    assertNonEmptyString(input.stackCompatibilityKey, "stackCompatibilityKey");
  }
}

function addSafeIntegers(first: number, second: number): number {
  const result = first + second;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Purchase item quantity exceeds the safe integer range");
  }

  return result;
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
