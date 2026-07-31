import type { PlayerId } from "@genesis-rift/shared";

import { createBackpack, type BackpackState } from "./backpack-state.ts";
import type { ItemInstance } from "./item-instance.ts";

export const TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS = 3;

export interface TemporaryPickup {
  readonly item: ItemInstance;
  readonly sourceId: string;
  readonly remainingOwnerTurns: number;
}

export interface PlayerInventoryState {
  readonly backpack: BackpackState;
  readonly temporaryPickup: TemporaryPickup | null;
}

export function createPlayerInventory(playerId: PlayerId): PlayerInventoryState {
  return {
    backpack: createBackpack(playerId),
    temporaryPickup: null,
  };
}
