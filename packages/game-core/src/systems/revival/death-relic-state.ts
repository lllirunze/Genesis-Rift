import type { PlayerId, TileId } from "@genesis-rift/shared";

import type { ItemInstance } from "../inventory/index.ts";

import {
  DEFAULT_DEATH_RELIC_OPEN_GLOBAL_TURNS,
  MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER,
} from "./revival-config.ts";

/** 描述单名玩家从指定死亡遗物包成功拾取的物品单位数量。 */
export interface DeathRelicPickupRecord {
  readonly playerId: PlayerId;
  readonly pickedUnitCount: number;
}

/** 描述地图死亡位置上可被玩家检视的临时遗物包状态。 */
export interface DeathRelicState {
  readonly deathRelicId: string;
  readonly ownerPlayerId: PlayerId;
  readonly tileId: TileId;
  readonly remainingGlobalTurns: number;
  readonly coinQuantity: number;
  readonly items: readonly ItemInstance[];
  readonly pickupRecords: readonly DeathRelicPickupRecord[];
}

/** 描述创建死亡遗物包时需要锁定的死亡位置与损失内容。 */
export interface CreateDeathRelicStateInput {
  readonly deathRelicId: string;
  readonly ownerPlayerId: PlayerId;
  readonly tileId: TileId;
  readonly coinQuantity: number;
  readonly items: readonly ItemInstance[];
  readonly remainingGlobalTurns?: number;
}

/**
 * 方法名：createDeathRelicState
 * 作用：根据角色正式死亡时已经确认损失的元宝与物品创建地图遗物包状态。
 * @param input 本次死亡遗物包的归属、位置、元宝与物品内容。
 * @returns 不可变的初始死亡遗物包状态，所有玩家的拾取计数从零开始。
 * @throws 标识为空、损失内容非法或物品实例重复时抛出错误。
 */
export function createDeathRelicState(input: CreateDeathRelicStateInput): DeathRelicState {
  const state: DeathRelicState = {
    deathRelicId: input.deathRelicId,
    ownerPlayerId: input.ownerPlayerId,
    tileId: input.tileId,
    remainingGlobalTurns: input.remainingGlobalTurns ?? DEFAULT_DEATH_RELIC_OPEN_GLOBAL_TURNS,
    coinQuantity: input.coinQuantity,
    items: input.items,
    pickupRecords: [],
  };
  validateDeathRelicState(state);

  return Object.freeze({
    ...state,
    items: Object.freeze(state.items.map((item) => Object.freeze({ ...item }))),
    pickupRecords: Object.freeze([]),
  });
}

/**
 * 方法名：getDeathRelicPickedUnitCount
 * 作用：读取指定玩家已经从一个死亡遗物包成功拾取的物品单位数量。
 * @param state 当前死亡遗物包状态。
 * @param playerId 需要查询拾取数量的玩家标识。
 * @returns 对应玩家已成功拾取的单位数，尚未拾取时返回零。
 * @throws 遗物状态非法时抛出错误。
 */
export function getDeathRelicPickedUnitCount(state: DeathRelicState, playerId: PlayerId): number {
  validateDeathRelicState(state);
  return state.pickupRecords.find((record) => record.playerId === playerId)?.pickedUnitCount ?? 0;
}

/**
 * 方法名：validateDeathRelicState
 * 作用：校验死亡遗物包的地图位置、损失内容与玩家拾取计数之间的一致性。
 * @param state 需要校验的死亡遗物包状态。
 * @returns 无返回值。
 * @throws 标识为空、数量非法、物品重复或拾取计数超出限制时抛出错误。
 */
export function validateDeathRelicState(state: DeathRelicState): void {
  assertNonEmptyString(state.deathRelicId, "deathRelicId");
  assertNonEmptyString(state.ownerPlayerId, "ownerPlayerId");
  assertNonEmptyString(state.tileId, "tileId");
  assertPositiveSafeInteger(state.remainingGlobalTurns, "remainingGlobalTurns");
  assertNonNegativeSafeInteger(state.coinQuantity, "coinQuantity");

  const itemInstanceIds = new Set<string>();

  for (const item of state.items) {
    assertNonEmptyString(item.instanceId, "item.instanceId");
    assertNonEmptyString(item.definitionId, "item.definitionId");

    if (itemInstanceIds.has(item.instanceId)) {
      throw new Error(`Duplicate death relic item instance: ${item.instanceId}`);
    }

    assertPositiveSafeInteger(item.quantity, "item.quantity");
    itemInstanceIds.add(item.instanceId);
  }

  const pickedPlayerIds = new Set<PlayerId>();

  for (const record of state.pickupRecords) {
    assertNonEmptyString(record.playerId, "pickupRecord.playerId");

    if (pickedPlayerIds.has(record.playerId)) {
      throw new Error(`Duplicate death relic pickup record: ${record.playerId}`);
    }

    assertNonNegativeSafeInteger(record.pickedUnitCount, "pickupRecord.pickedUnitCount");

    if (record.pickedUnitCount > MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER) {
      throw new RangeError("Death relic pickup count exceeds the configured player limit");
    }

    pickedPlayerIds.add(record.playerId);
  }
}

/** 校验字符串不为空。 */
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
