import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { getItemDefinition } from "../inventory/backpack-geometry.ts";
import { consumeBackpackItemQuantity } from "../inventory/consume-backpack-item.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { receiveItem, type ReceiveItemResult } from "../inventory/receive-item.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface ReceiveCoinInput {
  readonly quantity: number;
  readonly sourceId: string;
  readonly newItemInstanceIds: readonly string[];
  readonly allowTemporaryStorage?: boolean;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface SpendCoinInput {
  readonly coinQuantity: number;
  readonly reasonId: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CoinPaymentRecord {
  readonly playerId: PlayerId;
  readonly coinQuantity: number;
  readonly reasonId: string;
  readonly consumedItemInstanceIds: readonly string[];
}

/** 描述业务操作完成后返回的结果。 */
export interface SpendCoinResult {
  readonly inventory: PlayerInventoryState;
  readonly remainingBalance: number;
  readonly payment: CoinPaymentRecord;
}

/**
 * 方法名：getCoinBalance
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param inventory 方法所需的 inventory 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：canAffordCoin
 * 作用：判断输入是否满足当前业务条件。
 * @param inventory 方法所需的 inventory 参数。
 * @param coinQuantity 方法所需的 coinQuantity 参数。
 * @returns 本次处理得到的结果。
 */
export function canAffordCoin(inventory: PlayerInventoryState, coinQuantity: number): boolean {
  assertNonNegativeSafeInteger(coinQuantity, "coinQuantity");
  return getCoinBalance(inventory) >= coinQuantity;
}

/**
 * 方法名：receiveCoin
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param input 本次处理的输入数据。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：spendCoin
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：validateCoinDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateCoinDefinition(definitions: ItemDefinitionCatalog): void {
  const definition = getItemDefinition(definitions, COIN_ITEM_DEFINITION_ID);

  if (definition.category !== "currency" || definition.width !== 1 || definition.height !== 1) {
    throw new Error("Coin item definition must be a 1 x 1 currency item");
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
