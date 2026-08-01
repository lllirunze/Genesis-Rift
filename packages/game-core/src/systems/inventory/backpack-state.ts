import type { PlayerId } from "@genesis-rift/shared";

import type { BackpackLevel } from "./backpack-definition.ts";
import type { ItemInstance } from "./item-instance.ts";

export interface BackpackPosition {
  readonly x: number;
  readonly y: number;
}

export interface BackpackEntry {
  readonly item: ItemInstance;
  readonly position: BackpackPosition;
}

export interface BackpackState {
  readonly playerId: PlayerId;
  readonly level: BackpackLevel;
  readonly entries: readonly BackpackEntry[];
}

export function createBackpack(playerId: PlayerId): BackpackState {
  return {
    playerId,
    level: 1,
    entries: [],
  };
}

export function getBackpackEntry(backpack: BackpackState, itemInstanceId: string): BackpackEntry {
  const entry = backpack.entries.find((candidate) => candidate.item.instanceId === itemInstanceId);

  if (entry === undefined) {
    throw new Error(`Backpack item not found: ${itemInstanceId}`);
  }

  return entry;
}
