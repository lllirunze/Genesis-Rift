import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";
import { getBackpackUsableArea } from "./backpack-definition.ts";
import {
  createBackpackGrid,
  findFirstAvailableBackpackPosition,
  isBackpackPositionAvailable,
} from "./backpack-geometry.ts";
import {
  getBackpackUnlockedCellCount,
  moveBackpackItem,
  placeItemInBackpack,
  removeBackpackItem,
  upgradeBackpack,
} from "./backpack-operations.ts";
import { createBackpack } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance } from "./item-instance.ts";
import { validateBackpackState } from "./validate-backpack-state.ts";

const PLAYER_ID = "player-1" as PlayerId;
const OTHER_PLAYER_ID = "player-2" as PlayerId;

const DEFINITIONS = {
  "item.coin": {
    definitionId: "item.coin",
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  "item.potion": {
    definitionId: "item.potion",
    name: "Potion",
    category: "consumable",
    quality: "common",
    width: 1,
    height: 2,
    maximumStack: 1,
  },
  "item.armor": {
    definitionId: "item.armor",
    name: "Armor",
    category: "equipment",
    quality: "excellent",
    width: 3,
    height: 3,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("backpack fixed grid", () => {
  it("always exposes a 6 x 8 grid while level one unlocks only the top-left 4 x 6 area", () => {
    const backpack = createBackpack(PLAYER_ID);
    const grid = createBackpackGrid(backpack, DEFINITIONS);

    expect(grid).toHaveLength(BACKPACK_GRID_HEIGHT);
    expect(grid.every((row) => row.length === BACKPACK_GRID_WIDTH)).toBe(true);
    expect(getBackpackUsableArea(1)).toEqual({ width: 4, height: 6 });
    expect(getBackpackUnlockedCellCount(backpack)).toBe(24);
    expect(grid[5]![3]).toEqual({ kind: "empty" });
    expect(grid[5]![4]).toEqual({ kind: "locked" });
    expect(grid[6]![0]).toEqual({ kind: "locked" });
  });

  it("rejects locked cells, overlaps, and implicit rotation", () => {
    const potion = createItemInstance(
      {
        instanceId: "item-instance.potion",
        definitionId: "item.potion",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.potion"],
    );
    const backpack = placeItemInBackpack(
      createBackpack(PLAYER_ID),
      potion,
      { x: 0, y: 0 },
      DEFINITIONS,
    );

    expect(
      isBackpackPositionAvailable(backpack, DEFINITIONS["item.coin"], { x: 0, y: 1 }, DEFINITIONS),
    ).toBe(false);
    expect(
      isBackpackPositionAvailable(backpack, DEFINITIONS["item.coin"], { x: 4, y: 0 }, DEFINITIONS),
    ).toBe(false);

    // A 1 x 2 potion cannot use the final row as though it were rotated to 2 x 1.
    expect(
      isBackpackPositionAvailable(
        createBackpack(PLAYER_ID),
        DEFINITIONS["item.potion"],
        { x: 0, y: 5 },
        DEFINITIONS,
      ),
    ).toBe(false);
  });

  it("moves and removes items without mutating the previous backpack", () => {
    const armor = createItemInstance(
      {
        instanceId: "item-instance.armor",
        definitionId: "item.armor",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.armor"],
    );
    const backpack = placeItemInBackpack(
      createBackpack(PLAYER_ID),
      armor,
      { x: 0, y: 0 },
      DEFINITIONS,
    );
    const movedBackpack = moveBackpackItem(backpack, armor.instanceId, { x: 1, y: 3 }, DEFINITIONS);
    const removal = removeBackpackItem(movedBackpack, armor.instanceId);

    expect(backpack.entries[0]!.position).toEqual({ x: 0, y: 0 });
    expect(movedBackpack.entries[0]!.position).toEqual({ x: 1, y: 3 });
    expect(removal.item).toEqual(armor);
    expect(removal.backpack.entries).toEqual([]);
  });

  it("upgrades by unlocking more top-left cells without moving existing items", () => {
    const coin = createItemInstance(
      {
        instanceId: "item-instance.coin",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.coin"],
    );
    const levelOne = placeItemInBackpack(
      createBackpack(PLAYER_ID),
      coin,
      { x: 3, y: 5 },
      DEFINITIONS,
    );
    const levelTwo = upgradeBackpack(levelOne);
    const levelThree = upgradeBackpack(levelTwo);

    expect(levelTwo.level).toBe(2);
    expect(levelTwo.entries).toEqual(levelOne.entries);
    expect(getBackpackUnlockedCellCount(levelTwo)).toBe(36);
    expect(getBackpackUnlockedCellCount(levelThree)).toBe(48);
    expect(
      isBackpackPositionAvailable(levelTwo, DEFINITIONS["item.coin"], { x: 5, y: 5 }, DEFINITIONS),
    ).toBe(true);
    expect(
      isBackpackPositionAvailable(levelTwo, DEFINITIONS["item.coin"], { x: 5, y: 6 }, DEFINITIONS),
    ).toBe(false);
    expect(
      isBackpackPositionAvailable(
        levelThree,
        DEFINITIONS["item.coin"],
        { x: 5, y: 7 },
        DEFINITIONS,
      ),
    ).toBe(true);
    expect(() => upgradeBackpack(levelThree)).toThrow("maximum level");
  });

  it("finds positions from top to bottom and left to right", () => {
    const coin = createItemInstance(
      {
        instanceId: "item-instance.coin",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.coin"],
    );
    const backpack = placeItemInBackpack(
      createBackpack(PLAYER_ID),
      coin,
      { x: 0, y: 0 },
      DEFINITIONS,
    );

    expect(
      findFirstAvailableBackpackPosition(backpack, DEFINITIONS["item.coin"], DEFINITIONS),
    ).toEqual({ x: 1, y: 0 });
  });

  it("rejects items owned by another player and duplicate instance ids", () => {
    const foreignCoin = createItemInstance(
      {
        instanceId: "item-instance.coin",
        definitionId: "item.coin",
        ownerPlayerId: OTHER_PLAYER_ID,
      },
      DEFINITIONS["item.coin"],
    );

    expect(() =>
      placeItemInBackpack(createBackpack(PLAYER_ID), foreignCoin, { x: 0, y: 0 }, DEFINITIONS),
    ).toThrow("owned by another player");
  });

  it("validates restored backpack state against locked cells and overlaps", () => {
    const coin = createItemInstance(
      {
        instanceId: "item-instance.coin",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.coin"],
    );
    const invalidBackpack = {
      ...createBackpack(PLAYER_ID),
      entries: [{ item: coin, position: { x: 4, y: 0 } }],
    };

    expect(() => validateBackpackState(invalidBackpack, DEFINITIONS)).toThrow(
      "Invalid position for backpack item",
    );
  });
});
