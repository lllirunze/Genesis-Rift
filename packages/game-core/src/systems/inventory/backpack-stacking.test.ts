import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { placeItemInBackpack } from "./backpack-operations.ts";
import {
  getBackpackItemQuantity,
  mergeBackpackItemStacks,
  splitBackpackItemStack,
} from "./backpack-stacking.ts";
import { createBackpack, getBackpackEntry } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance } from "./item-instance.ts";

const PLAYER_ID = "player-1" as PlayerId;

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
} as const satisfies ItemDefinitionCatalog;

describe("backpack item stacking", () => {
  it("partially merges into the target maximum and preserves the remainder", () => {
    const backpack = createBackpackWithCoinStacks(4, 3);
    const result = mergeBackpackItemStacks(
      backpack,
      "item-instance.source",
      "item-instance.target",
      DEFINITIONS,
    );

    expect(result.transferredQuantity).toBe(1);
    expect(getBackpackEntry(result.backpack, "item-instance.target").item.quantity).toBe(5);
    expect(getBackpackEntry(result.backpack, "item-instance.source").item.quantity).toBe(2);
    expect(getBackpackItemQuantity(result.backpack, "item.coin")).toBe(7);
    expect(getBackpackEntry(backpack, "item-instance.target").item.quantity).toBe(4);
  });

  it("removes the source stack after a complete merge", () => {
    const backpack = createBackpackWithCoinStacks(4, 1);
    const result = mergeBackpackItemStacks(
      backpack,
      "item-instance.source",
      "item-instance.target",
      DEFINITIONS,
    );

    expect(result.transferredQuantity).toBe(1);
    expect(result.backpack.entries).toHaveLength(1);
    expect(getBackpackEntry(result.backpack, "item-instance.target").item.quantity).toBe(5);
  });

  it("splits a stack into a new instance at a legal position", () => {
    const backpack = createBackpackWithCoinStacks(4, 1);
    const splitBackpack = splitBackpackItemStack(
      backpack,
      "item-instance.target",
      2,
      "item-instance.split",
      { x: 2, y: 0 },
      DEFINITIONS,
    );

    expect(getBackpackEntry(splitBackpack, "item-instance.target").item.quantity).toBe(2);
    expect(getBackpackEntry(splitBackpack, "item-instance.split")).toMatchObject({
      position: { x: 2, y: 0 },
      item: { quantity: 2, stackCompatibilityKey: "default" },
    });
    expect(getBackpackItemQuantity(splitBackpack, "item.coin")).toBe(5);
  });

  it("rejects invalid merges and splits without changing the source backpack", () => {
    const backpack = createBackpackWithCoinStacks(5, 1);

    expect(() =>
      mergeBackpackItemStacks(
        backpack,
        "item-instance.source",
        "item-instance.target",
        DEFINITIONS,
      ),
    ).toThrow("already full");
    expect(() =>
      splitBackpackItemStack(
        backpack,
        "item-instance.source",
        1,
        "item-instance.split",
        { x: 2, y: 0 },
        DEFINITIONS,
      ),
    ).toThrow("less than the source stack quantity");
    expect(getBackpackItemQuantity(backpack, "item.coin")).toBe(6);
  });
});

/**
 * 方法名：createBackpackWithCoinStacks
 * 作用：创建并校验该方法所负责的业务对象。
 * @param targetQuantity 方法所需的 targetQuantity 参数。
 * @param sourceQuantity 方法所需的 sourceQuantity 参数。
 * @returns 本次处理得到的结果。
 */
function createBackpackWithCoinStacks(targetQuantity: number, sourceQuantity: number) {
  const target = createItemInstance(
    {
      instanceId: "item-instance.target",
      definitionId: "item.coin",
      ownerPlayerId: PLAYER_ID,
      quantity: targetQuantity,
    },
    DEFINITIONS["item.coin"],
  );
  const source = createItemInstance(
    {
      instanceId: "item-instance.source",
      definitionId: "item.coin",
      ownerPlayerId: PLAYER_ID,
      quantity: sourceQuantity,
    },
    DEFINITIONS["item.coin"],
  );
  const withTarget = placeItemInBackpack(
    createBackpack(PLAYER_ID),
    target,
    { x: 0, y: 0 },
    DEFINITIONS,
  );

  return placeItemInBackpack(withTarget, source, { x: 1, y: 0 }, DEFINITIONS);
}
