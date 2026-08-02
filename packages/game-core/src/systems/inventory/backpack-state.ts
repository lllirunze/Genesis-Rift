import type { PlayerId } from "@genesis-rift/shared";

import type { BackpackLevel } from "./backpack-definition.ts";
import type { ItemInstance } from "./item-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface BackpackPosition {
  readonly x: number;
  readonly y: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface BackpackEntry {
  readonly item: ItemInstance;
  readonly position: BackpackPosition;
}

/** 描述业务对象在运行时保存的状态。 */
export interface BackpackState {
  readonly playerId: PlayerId;
  readonly level: BackpackLevel;
  readonly entries: readonly BackpackEntry[];
}

/**
 * 方法名：createBackpack
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @returns 本次处理得到的结果。
 */
export function createBackpack(playerId: PlayerId): BackpackState {
  return {
    playerId,
    level: 1,
    entries: [],
  };
}

/**
 * 方法名：getBackpackEntry
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param backpack 方法所需的 backpack 参数。
 * @param itemInstanceId 方法所需的 itemInstanceId 参数。
 * @returns 本次处理得到的结果。
 */
export function getBackpackEntry(backpack: BackpackState, itemInstanceId: string): BackpackEntry {
  const entry = backpack.entries.find((candidate) => candidate.item.instanceId === itemInstanceId);

  if (entry === undefined) {
    throw new Error(`Backpack item not found: ${itemInstanceId}`);
  }

  return entry;
}
