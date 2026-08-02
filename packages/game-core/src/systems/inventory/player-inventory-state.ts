import type { PlayerId } from "@genesis-rift/shared";

import { createBackpack, type BackpackState } from "./backpack-state.ts";
import type { ItemInstance } from "./item-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface TemporaryPickup {
  readonly item: ItemInstance;
  readonly sourceId: string;
  readonly remainingOwnerTurns: number;
}

/** 描述业务对象在运行时保存的状态。 */
export interface PlayerInventoryState {
  readonly backpack: BackpackState;
  readonly temporaryPickup: TemporaryPickup | null;
}

/**
 * 方法名：createPlayerInventory
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @returns 本次处理得到的结果。
 */
export function createPlayerInventory(playerId: PlayerId): PlayerInventoryState {
  return {
    backpack: createBackpack(playerId),
    temporaryPickup: null,
  };
}
