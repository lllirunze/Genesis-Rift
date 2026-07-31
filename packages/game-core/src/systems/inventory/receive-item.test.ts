import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { placeItemInBackpack } from "./backpack-operations.ts";
import { getBackpackEntry } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance } from "./item-instance.ts";
import { createPlayerInventory } from "./player-inventory-state.ts";
import { receiveItem } from "./receive-item.ts";

const PLAYER_ID = "player-1" as PlayerId;

const DEFINITIONS = {
  "item.coin": {
    definitionId: "item.coin",
    name: "Yuanbao",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  "item.blocker": {
    definitionId: "item.blocker",
    name: "Large Blocker",
    category: "special",
    quality: "common",
    width: 4,
    height: 6,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("receiveItem", () => {
  it("fills existing stacks before creating and placing normalized item units", () => {
    const existingCoin = createItemInstance(
      {
        instanceId: "item-instance.existing",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
        quantity: 3,
      },
      DEFINITIONS["item.coin"],
    );
    const initialInventory = createPlayerInventory(PLAYER_ID);
    const inventory = {
      ...initialInventory,
      backpack: placeItemInBackpack(
        initialInventory.backpack,
        existingCoin,
        { x: 0, y: 0 },
        DEFINITIONS,
      ),
    };
    const result = receiveItem(
      inventory,
      {
        definitionId: "item.coin",
        quantity: 8,
        sourceId: "event.reward",
        newItemInstanceIds: ["item-instance.new-1", "item-instance.new-2"],
      },
      DEFINITIONS,
    );

    expect(result.backpackQuantityAdded).toBe(8);
    expect(result.temporaryQuantityAdded).toBe(0);
    expect(result.unresolvedItems).toEqual([]);
    expect(getBackpackEntry(result.inventory.backpack, existingCoin.instanceId).item.quantity).toBe(
      5,
    );
    expect(getBackpackEntry(result.inventory.backpack, "item-instance.new-1")).toMatchObject({
      position: { x: 1, y: 0 },
      item: { quantity: 5 },
    });
    expect(getBackpackEntry(result.inventory.backpack, "item-instance.new-2")).toMatchObject({
      position: { x: 2, y: 0 },
      item: { quantity: 1 },
    });
    expect(getBackpackEntry(inventory.backpack, existingCoin.instanceId).item.quantity).toBe(3);
  });

  it("stores only one normalized unit temporarily and returns the rest unresolved", () => {
    const inventory = createFullLevelOneInventory();
    const result = receiveItem(
      inventory,
      {
        definitionId: "item.coin",
        quantity: 7,
        sourceId: "battle.loot",
        newItemInstanceIds: ["item-instance.coin-1", "item-instance.coin-2"],
      },
      DEFINITIONS,
    );

    expect(result.backpackQuantityAdded).toBe(0);
    expect(result.temporaryQuantityAdded).toBe(5);
    expect(result.inventory.temporaryPickup).toMatchObject({
      item: { instanceId: "item-instance.coin-1", quantity: 5 },
      sourceId: "battle.loot",
      remainingOwnerTurns: 3,
    });
    expect(result.unresolvedItems).toEqual([
      {
        item: expect.objectContaining({ instanceId: "item-instance.coin-2", quantity: 2 }),
        sourceId: "battle.loot",
      },
    ]);
  });

  it("does not overwrite an occupied temporary pickup", () => {
    const firstResult = receiveItem(
      createFullLevelOneInventory(),
      {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "event.first",
        newItemInstanceIds: ["item-instance.first"],
      },
      DEFINITIONS,
    );
    const secondResult = receiveItem(
      firstResult.inventory,
      {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "event.second",
        newItemInstanceIds: ["item-instance.second"],
      },
      DEFINITIONS,
    );

    expect(secondResult.inventory.temporaryPickup).toEqual(firstResult.inventory.temporaryPickup);
    expect(secondResult.unresolvedItems[0]).toMatchObject({
      item: { instanceId: "item-instance.second" },
      sourceId: "event.second",
    });
  });

  it("can disable temporary storage and validates instance ids before changing state", () => {
    const inventory = createFullLevelOneInventory();
    const result = receiveItem(
      inventory,
      {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "quest.reward",
        newItemInstanceIds: ["item-instance.coin"],
        allowTemporaryStorage: false,
      },
      DEFINITIONS,
    );

    expect(result.inventory).toEqual(inventory);
    expect(result.temporaryQuantityAdded).toBe(0);
    expect(result.unresolvedItems).toHaveLength(1);
    expect(() =>
      receiveItem(
        inventory,
        {
          definitionId: "item.coin",
          quantity: 6,
          sourceId: "quest.reward",
          newItemInstanceIds: ["only-one-id"],
        },
        DEFINITIONS,
      ),
    ).toThrow("requires 2 new item instance ids");
    expect(inventory.temporaryPickup).toBeNull();
  });
});

function createFullLevelOneInventory() {
  const blocker = createItemInstance(
    {
      instanceId: "item-instance.blocker",
      definitionId: "item.blocker",
      ownerPlayerId: PLAYER_ID,
    },
    DEFINITIONS["item.blocker"],
  );
  const inventory = createPlayerInventory(PLAYER_ID);

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, blocker, { x: 0, y: 0 }, DEFINITIONS),
  };
}
