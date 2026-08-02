import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { placeItemInBackpack, removeBackpackItem } from "./backpack-operations.ts";
import { getBackpackEntry } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance } from "./item-instance.ts";
import { createPlayerInventory } from "./player-inventory-state.ts";
import { receiveItem } from "./receive-item.ts";
import {
  abandonTemporaryPickup,
  advanceTemporaryPickupOwnerTurn,
  storeTemporaryPickupInBackpack,
} from "./temporary-pickup.ts";
import { validatePlayerInventoryState } from "./validate-player-inventory-state.ts";

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

describe("temporary pickup", () => {
  it("enters temporary storage only through an acquisition that cannot fit in the backpack", () => {
    const inventory = createInventoryWithTemporaryCoin(2);

    expect(inventory.temporaryPickup).toMatchObject({
      item: { instanceId: "item-instance.temporary", quantity: 2 },
      sourceId: "event.reward",
      remainingOwnerTurns: 3,
    });
  });

  it("counts down only when its owner-turn function is advanced and expires on the third call", () => {
    const inventory = createInventoryWithTemporaryCoin(2);
    const first = advanceTemporaryPickupOwnerTurn(inventory);
    const second = advanceTemporaryPickupOwnerTurn(first.inventory);
    const third = advanceTemporaryPickupOwnerTurn(second.inventory);

    expect(first.inventory.temporaryPickup?.remainingOwnerTurns).toBe(2);
    expect(second.inventory.temporaryPickup?.remainingOwnerTurns).toBe(1);
    expect(third.inventory.temporaryPickup).toBeNull();
    expect(third.expiredPickup).toMatchObject({
      item: { instanceId: "item-instance.temporary", quantity: 2 },
      sourceId: "event.reward",
    });
    expect(inventory.temporaryPickup?.remainingOwnerTurns).toBe(3);
  });

  it("prioritizes compatible stacks when moving a temporary item into the backpack", () => {
    const existingCoin = createItemInstance(
      {
        instanceId: "item-instance.existing",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
        quantity: 3,
      },
      DEFINITIONS["item.coin"],
    );
    const initialInventory = createInventoryWithTemporaryCoin(2);
    const inventory = {
      ...initialInventory,
      backpack: placeItemInBackpack(
        initialInventory.backpack,
        existingCoin,
        { x: 0, y: 0 },
        DEFINITIONS,
      ),
    };
    const storedInventory = storeTemporaryPickupInBackpack(inventory, DEFINITIONS);

    expect(storedInventory.temporaryPickup).toBeNull();
    expect(getBackpackEntry(storedInventory.backpack, existingCoin.instanceId).item.quantity).toBe(
      5,
    );
    expect(storedInventory.backpack.entries).toHaveLength(1);
  });

  it("keeps the operation atomic when a partially merged remainder has no legal destination", () => {
    const existingCoin = createItemInstance(
      {
        instanceId: "item-instance.existing",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
        quantity: 4,
      },
      DEFINITIONS["item.coin"],
    );
    const initialInventory = createInventoryWithTemporaryCoin(2);
    const inventory = {
      ...initialInventory,
      backpack: placeItemInBackpack(
        initialInventory.backpack,
        existingCoin,
        { x: 0, y: 0 },
        DEFINITIONS,
      ),
    };

    expect(() => storeTemporaryPickupInBackpack(inventory, DEFINITIONS, { x: 4, y: 0 })).toThrow(
      "cannot be placed",
    );
    expect(getBackpackEntry(inventory.backpack, existingCoin.instanceId).item.quantity).toBe(4);
    expect(inventory.temporaryPickup?.item.quantity).toBe(2);
  });

  it("stores the temporary item after space is released and supports explicit abandonment", () => {
    const blocker = createItemInstance(
      {
        instanceId: "item-instance.blocker",
        definitionId: "item.blocker",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.blocker"],
    );
    const initialInventory = createInventoryWithTemporaryCoin(1);
    const fullInventory = {
      ...initialInventory,
      backpack: placeItemInBackpack(
        initialInventory.backpack,
        blocker,
        { x: 0, y: 0 },
        DEFINITIONS,
      ),
    };
    const releasedInventory = {
      ...fullInventory,
      backpack: removeBackpackItem(fullInventory.backpack, blocker.instanceId).backpack,
    };
    const storedInventory = storeTemporaryPickupInBackpack(releasedInventory, DEFINITIONS);
    const newTemporaryInventory = createInventoryWithTemporaryCoin(1);
    const abandoned = abandonTemporaryPickup(newTemporaryInventory);

    expect(storedInventory.temporaryPickup).toBeNull();
    expect(getBackpackEntry(storedInventory.backpack, "item-instance.temporary").position).toEqual({
      x: 0,
      y: 0,
    });
    expect(abandoned.inventory.temporaryPickup).toBeNull();
    expect(abandoned.removedPickup.item.instanceId).toBe("item-instance.temporary");
  });

  it("validates temporary pickup ownership, source, and remaining turns", () => {
    const inventory = createInventoryWithTemporaryCoin(1);

    expect(() => validatePlayerInventoryState(inventory, DEFINITIONS)).not.toThrow();
    expect(() =>
      validatePlayerInventoryState(
        {
          ...inventory,
          temporaryPickup: {
            ...inventory.temporaryPickup!,
            remainingOwnerTurns: 4,
          },
        },
        DEFINITIONS,
      ),
    ).toThrow("remainingOwnerTurns must be between 1 and 3");
  });
});

/**
 * 方法名：createInventoryWithTemporaryCoin
 * 作用：创建并校验该方法所负责的业务对象。
 * @param quantity 方法所需的 quantity 参数。
 * @returns 本次处理得到的结果。
 */
function createInventoryWithTemporaryCoin(quantity: number) {
  const blocker = createItemInstance(
    {
      instanceId: "item-instance.acquisition-blocker",
      definitionId: "item.blocker",
      ownerPlayerId: PLAYER_ID,
    },
    DEFINITIONS["item.blocker"],
  );
  const emptyInventory = createPlayerInventory(PLAYER_ID);
  const fullInventory = {
    ...emptyInventory,
    backpack: placeItemInBackpack(emptyInventory.backpack, blocker, { x: 0, y: 0 }, DEFINITIONS),
  };
  const receivedInventory = receiveItem(
    fullInventory,
    {
      definitionId: "item.coin",
      quantity,
      sourceId: "event.reward",
      newItemInstanceIds: ["item-instance.temporary"],
    },
    DEFINITIONS,
  ).inventory;

  return {
    ...receivedInventory,
    backpack: removeBackpackItem(receivedInventory.backpack, blocker.instanceId).backpack,
  };
}
