import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { getItemDefinition } from "../inventory/backpack-geometry.ts";
import { consumeBackpackItemQuantity } from "../inventory/consume-backpack-item.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { receiveItem, type ReceiveItemResult } from "../inventory/receive-item.ts";

export interface ReceiveCoinInput {
  readonly quantity: number;
  readonly sourceId: string;
  readonly newItemInstanceIds: readonly string[];
  readonly allowTemporaryStorage?: boolean;
}

export interface SpendCoinInput {
  readonly coinQuantity: number;
  readonly reasonId: string;
}

export interface CoinPaymentRecord {
  readonly playerId: PlayerId;
  readonly coinQuantity: number;
  readonly reasonId: string;
  readonly consumedItemInstanceIds: readonly string[];
}

export interface SpendCoinResult {
  readonly inventory: PlayerInventoryState;
  readonly remainingBalance: number;
  readonly payment: CoinPaymentRecord;
}

export function getCoinBalance(inventory: PlayerInventoryState): number {
  let balance = 0;

  for (const entry of inventory.backpack.entries) {
    if (entry.item.definitionId !== COIN_ITEM_DEFINITION_ID) {
      continue;
    }

    balance += entry.item.quantity;

    if (!Number.isSafeInteger(balance)) {
      throw new RangeError("Coin balance exceeds the safe integer range");
    }
  }

  return balance;
}

export function canAffordCoin(inventory: PlayerInventoryState, coinQuantity: number): boolean {
  assertNonNegativeSafeInteger(coinQuantity, "coinQuantity");
  return getCoinBalance(inventory) >= coinQuantity;
}

export function receiveCoin(
  inventory: PlayerInventoryState,
  input: ReceiveCoinInput,
  definitions: ItemDefinitionCatalog,
): ReceiveItemResult {
  validateCoinDefinition(definitions);

  return receiveItem(
    inventory,
    {
      definitionId: COIN_ITEM_DEFINITION_ID,
      quantity: input.quantity,
      sourceId: input.sourceId,
      newItemInstanceIds: input.newItemInstanceIds,
      ...(input.allowTemporaryStorage === undefined
        ? {}
        : { allowTemporaryStorage: input.allowTemporaryStorage }),
    },
    definitions,
  );
}

export function spendCoin(inventory: PlayerInventoryState, input: SpendCoinInput): SpendCoinResult {
  assertNonNegativeSafeInteger(input.coinQuantity, "coinQuantity");
  assertNonEmptyString(input.reasonId, "reasonId");

  const currentBalance = getCoinBalance(inventory);

  if (currentBalance < input.coinQuantity) {
    throw new RangeError(
      `Insufficient Coin: required ${input.coinQuantity}, available ${currentBalance}`,
    );
  }

  const consumption = consumeBackpackItemQuantity(
    inventory.backpack,
    COIN_ITEM_DEFINITION_ID,
    input.coinQuantity,
  );

  return {
    inventory: {
      ...inventory,
      backpack: consumption.backpack,
    },
    remainingBalance: consumption.remainingDefinitionQuantity,
    payment: {
      playerId: inventory.backpack.playerId,
      coinQuantity: input.coinQuantity,
      reasonId: input.reasonId,
      consumedItemInstanceIds: consumption.consumedItemInstanceIds,
    },
  };
}

function validateCoinDefinition(definitions: ItemDefinitionCatalog): void {
  const definition = getItemDefinition(definitions, COIN_ITEM_DEFINITION_ID);

  if (definition.category !== "currency" || definition.width !== 1 || definition.height !== 1) {
    throw new Error("Coin item definition must be a 1 x 1 currency item");
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
