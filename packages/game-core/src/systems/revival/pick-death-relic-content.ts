import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import { receiveCoin } from "../economy/index.ts";
import { receiveItem, type PlayerInventoryState } from "../inventory/index.ts";

import {
  getDeathRelicPickedUnitCount,
  validateDeathRelicState,
  type DeathRelicState,
} from "./death-relic-state.ts";
import { MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER } from "./revival-config.ts";

/** 描述玩家从死亡遗物包选择的内容目标。 */
export type DeathRelicPickupTarget =
  | {
      readonly kind: "COIN";
    }
  | {
      readonly kind: "ITEM";
      readonly itemInstanceId: string;
    };

/** 描述死亡遗物内容无法完成拾取的业务原因。 */
export type DeathRelicPickupFailureReason =
  "NOT_ON_RELIC_TILE" | "PICKUP_LIMIT_REACHED" | "CONTENT_NOT_FOUND" | "INVENTORY_CANNOT_RECEIVE";

/** 描述从死亡遗物包领取内容所需的完整业务输入。 */
export interface PickDeathRelicContentInput {
  readonly relic: DeathRelicState;
  readonly inventory: PlayerInventoryState;
  readonly currentTileId: TileId;
  readonly target: DeathRelicPickupTarget;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly newItemInstanceIds: readonly string[];
}

/** 描述死亡遗物内容成功转移后的结果。 */
export interface PickedDeathRelicContentResult {
  readonly outcome: "PICKED";
  readonly relic: DeathRelicState;
  readonly inventory: PlayerInventoryState;
  readonly pickedTarget: DeathRelicPickupTarget;
}

/** 描述死亡遗物内容未发生转移时的结果。 */
export interface RejectedDeathRelicPickupResult {
  readonly outcome: "REJECTED";
  readonly reason: DeathRelicPickupFailureReason;
  readonly relic: DeathRelicState;
  readonly inventory: PlayerInventoryState;
}

/** 描述死亡遗物内容拾取操作的成功或失败结果。 */
export type PickDeathRelicContentResult =
  PickedDeathRelicContentResult | RejectedDeathRelicPickupResult;

/**
 * 方法名：pickDeathRelicContent
 * 作用：按遗物位置、个人次数、内容存在与背包接收结果的固定顺序，原子转移一个遗物内容单位。
 * @param input 当前遗物、拾取玩家背包、所在格、目标内容、物品定义与可能需要的新实例标识。
 * @returns 成功时返回同步更新后的遗物与背包；失败时返回保持不变的原状态与原因。
 * @throws 静态物品定义、实例标识或状态结构非法时抛出错误。
 */
export function pickDeathRelicContent(
  input: PickDeathRelicContentInput,
): PickDeathRelicContentResult {
  validateDeathRelicState(input.relic);
  assertNonEmptyString(input.currentTileId, "currentTileId");

  const playerId = input.inventory.backpack.playerId;

  if (input.currentTileId !== input.relic.tileId) {
    return reject(input, "NOT_ON_RELIC_TILE");
  }

  if (
    getDeathRelicPickedUnitCount(input.relic, playerId) >= MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER
  ) {
    return reject(input, "PICKUP_LIMIT_REACHED");
  }

  if (input.target.kind === "COIN") {
    return pickCoin(input, playerId);
  }

  return pickItem(input, playerId, input.target);
}

/**
 * 方法名：pickCoin
 * 作用：通过统一元宝接收入口预演并提交遗物中的全部元宝内容。
 * @param input 已通过位置与个人次数校验的拾取输入。
 * @param playerId 当前拾取玩家标识。
 * @returns 元宝成功转移或保持原状态的失败结果。
 */
function pickCoin(
  input: PickDeathRelicContentInput,
  playerId: PlayerId,
): PickDeathRelicContentResult {
  if (input.relic.coinQuantity === 0) {
    return reject(input, "CONTENT_NOT_FOUND");
  }

  const received = receiveCoin(
    input.inventory,
    {
      quantity: input.relic.coinQuantity,
      sourceId: input.relic.deathRelicId,
      newItemInstanceIds: input.newItemInstanceIds,
    },
    input.itemDefinitions,
  );

  if (received.unresolvedItems.length > 0) {
    return reject(input, "INVENTORY_CANNOT_RECEIVE");
  }

  return {
    outcome: "PICKED",
    relic: recordPickedContent(
      {
        ...input.relic,
        coinQuantity: 0,
      },
      playerId,
    ),
    inventory: received.inventory,
    pickedTarget: input.target,
  };
}

/**
 * 方法名：pickItem
 * 作用：通过统一物品接收入口预演并提交遗物中的一个物品内容单位。
 * @param input 已通过位置与个人次数校验的拾取输入。
 * @param playerId 当前拾取玩家标识。
 * @returns 物品成功转移或保持原状态的失败结果。
 */
function pickItem(
  input: PickDeathRelicContentInput,
  playerId: PlayerId,
  target: Extract<DeathRelicPickupTarget, { readonly kind: "ITEM" }>,
): PickDeathRelicContentResult {
  const targetItem = input.relic.items.find((item) => item.instanceId === target.itemInstanceId);

  if (targetItem === undefined) {
    return reject(input, "CONTENT_NOT_FOUND");
  }

  const received = receiveItem(
    input.inventory,
    {
      definitionId: targetItem.definitionId,
      quantity: targetItem.quantity,
      sourceId: input.relic.deathRelicId,
      newItemInstanceIds: input.newItemInstanceIds,
      stackCompatibilityKey: targetItem.stackCompatibilityKey,
    },
    input.itemDefinitions,
  );

  if (received.unresolvedItems.length > 0) {
    return reject(input, "INVENTORY_CANNOT_RECEIVE");
  }

  return {
    outcome: "PICKED",
    relic: recordPickedContent(
      {
        ...input.relic,
        items: input.relic.items.filter((item) => item.instanceId !== targetItem.instanceId),
      },
      playerId,
    ),
    inventory: received.inventory,
    pickedTarget: input.target,
  };
}

/**
 * 方法名：recordPickedContent
 * 作用：在内容已成功进入背包后，为当前玩家增加一次不可回退的遗物包拾取记录。
 * @param relic 已移除对应内容的遗物包状态。
 * @param playerId 本次成功拾取内容的玩家标识。
 * @returns 保持其余信息不变且拾取记录已更新的遗物包状态。
 */
function recordPickedContent(relic: DeathRelicState, playerId: PlayerId): DeathRelicState {
  const pickedUnitCount = getDeathRelicPickedUnitCount(relic, playerId);
  const pickupRecords = relic.pickupRecords.some((record) => record.playerId === playerId)
    ? relic.pickupRecords.map((record) =>
        record.playerId === playerId ? { ...record, pickedUnitCount: pickedUnitCount + 1 } : record,
      )
    : [...relic.pickupRecords, { playerId, pickedUnitCount: 1 }];
  const nextRelic: DeathRelicState = {
    ...relic,
    items: Object.freeze(relic.items.map((item) => Object.freeze({ ...item }))),
    pickupRecords: Object.freeze(pickupRecords.map((record) => Object.freeze({ ...record }))),
  };

  validateDeathRelicState(nextRelic);
  return Object.freeze(nextRelic);
}

/** 创建不会修改遗物与背包状态的统一失败结果。 */
function reject(
  input: PickDeathRelicContentInput,
  reason: DeathRelicPickupFailureReason,
): RejectedDeathRelicPickupResult {
  return {
    outcome: "REJECTED",
    reason,
    relic: input.relic,
    inventory: input.inventory,
  };
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
