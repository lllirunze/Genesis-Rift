import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { placeItemInBackpack } from "../inventory/backpack-operations.ts";
import { createItemInstance } from "../inventory/item-instance.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { getCoinBalance, receiveCoin } from "./coin.ts";
import { purchaseItemWithCoin } from "./purchase-item-with-coin.ts";

const PLAYER_ID = "player-1" as PlayerId;
const MATERIAL_ID = "item.material.linen";
const LARGE_ITEM_ID = "item.special.large-crate";

const DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: {
    definitionId: COIN_ITEM_DEFINITION_ID,
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  [MATERIAL_ID]: {
    definitionId: MATERIAL_ID,
    name: "Linen",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  [LARGE_ITEM_ID]: {
    definitionId: LARGE_ITEM_ID,
    name: "Large Crate",
    category: "special",
    quality: "excellent",
    width: 2,
    height: 2,
    maximumStack: 1,
  },
  "item.blocker.4x5": {
    definitionId: "item.blocker.4x5",
    name: "Large Blocker",
    category: "special",
    quality: "common",
    width: 4,
    height: 5,
    maximumStack: 1,
  },
  "item.blocker.1x1": {
    definitionId: "item.blocker.1x1",
    name: "Small Blocker",
    category: "special",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("purchaseItemWithCoin", () => {
  it("purchases multiple same items only after every normalized stack fits", () => {
    const inventory = createInventoryWithCoin(10);
    const result = purchaseItemWithCoin(
      inventory,
      {
        transactionId: "shop.purchase.linen",
        itemDefinitionId: MATERIAL_ID,
        itemQuantity: 8,
        totalCoinPrice: 6,
        newItemInstanceIds: ["linen-1", "linen-2"],
      },
      DEFINITIONS,
    );

    expect(result.purchased).toBe(true);
    if (!result.purchased) {
      throw new Error("Expected purchase to succeed");
    }
    expect(
      result.inventory.backpack.entries.flatMap((entry) =>
        entry.item.definitionId === MATERIAL_ID ? [entry.item.quantity] : [],
      ),
    ).toEqual([5, 3]);
    expect(result.receivedItemInstanceIds).toEqual(["linen-1", "linen-2"]);
    expect(result.currentCoinBalance).toBe(4);
    expect(getCoinBalance(inventory)).toBe(10);
  });

  it("fills existing compatible stacks before creating another stack", () => {
    const inventory = addItem(createInventoryWithCoin(10), MATERIAL_ID, "linen-existing", 3, {
      x: 2,
      y: 0,
    });
    const result = purchaseItemWithCoin(
      inventory,
      {
        transactionId: "shop.purchase.linen-refill",
        itemDefinitionId: MATERIAL_ID,
        itemQuantity: 4,
        totalCoinPrice: 2,
        newItemInstanceIds: ["linen-new"],
      },
      DEFINITIONS,
    );

    expect(result.purchased).toBe(true);
    expect(
      result.inventory.backpack.entries.flatMap((entry) =>
        entry.item.definitionId === MATERIAL_ID ? [entry.item.quantity] : [],
      ),
    ).toEqual([5, 2]);
  });

  it("fails the complete purchase when one item stack cannot fit", () => {
    let inventory = createPlayerInventory(PLAYER_ID);
    inventory = addItem(inventory, "item.blocker.4x5", "blocker-large", 1, { x: 0, y: 0 });
    inventory = receiveCoin(
      inventory,
      {
        quantity: 5,
        sourceId: "fixture.coin",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      DEFINITIONS,
    ).inventory;
    const result = purchaseItemWithCoin(
      inventory,
      {
        transactionId: "shop.purchase.large-crates",
        itemDefinitionId: LARGE_ITEM_ID,
        itemQuantity: 2,
        totalCoinPrice: 1,
        newItemInstanceIds: ["crate-1", "crate-2"],
      },
      DEFINITIONS,
    );

    expect(result).toMatchObject({
      purchased: false,
      inventory,
      reason: "insufficient-backpack-space",
      unstoredItemQuantity: 2,
    });
    expect(getCoinBalance(result.inventory)).toBe(5);
    expect(result.inventory).toBe(inventory);
    expect(inventory.temporaryPickup).toBeNull();
  });

  it("can use cells released by Coin payment during the transaction preview", () => {
    let inventory = createPlayerInventory(PLAYER_ID);
    inventory = addItem(inventory, "item.blocker.4x5", "blocker-large", 1, { x: 0, y: 0 });
    inventory = addItem(inventory, "item.blocker.1x1", "blocker-small-1", 1, { x: 1, y: 5 });
    inventory = addItem(inventory, "item.blocker.1x1", "blocker-small-2", 1, { x: 2, y: 5 });
    inventory = addItem(inventory, "item.blocker.1x1", "blocker-small-3", 1, { x: 3, y: 5 });
    inventory = receiveCoin(
      inventory,
      {
        quantity: 5,
        sourceId: "fixture.coin",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      DEFINITIONS,
    ).inventory;
    const result = purchaseItemWithCoin(
      inventory,
      {
        transactionId: "shop.purchase.after-payment-space",
        itemDefinitionId: MATERIAL_ID,
        itemQuantity: 1,
        totalCoinPrice: 5,
        newItemInstanceIds: ["linen-1"],
      },
      DEFINITIONS,
    );

    expect(result.purchased).toBe(true);
    expect(getCoinBalance(result.inventory)).toBe(0);
    expect(
      result.inventory.backpack.entries.find((entry) => entry.item.instanceId === "linen-1")
        ?.position,
    ).toEqual({ x: 0, y: 5 });
  });

  it("returns the original state when Coin is insufficient", () => {
    const inventory = createInventoryWithCoin(3);
    const result = purchaseItemWithCoin(
      inventory,
      {
        transactionId: "shop.purchase.expensive",
        itemDefinitionId: MATERIAL_ID,
        itemQuantity: 1,
        totalCoinPrice: 4,
        newItemInstanceIds: ["linen-1"],
      },
      DEFINITIONS,
    );

    expect(result).toMatchObject({
      purchased: false,
      inventory,
      reason: "insufficient-coin",
      missingCoinQuantity: 1,
    });
    expect(result.inventory).toBe(inventory);
    expect(getCoinBalance(inventory)).toBe(3);
  });
});

function createInventoryWithCoin(quantity: number) {
  return receiveCoin(
    createPlayerInventory(PLAYER_ID),
    {
      quantity,
      sourceId: "fixture.coin",
      newItemInstanceIds: ["coin-1", "coin-2"],
      allowTemporaryStorage: false,
    },
    DEFINITIONS,
  ).inventory;
}

function addItem(
  inventory: ReturnType<typeof createPlayerInventory>,
  definitionId: keyof typeof DEFINITIONS,
  instanceId: string,
  quantity: number,
  position: { readonly x: number; readonly y: number },
) {
  const item = createItemInstance(
    { instanceId, definitionId, ownerPlayerId: PLAYER_ID, quantity },
    DEFINITIONS[definitionId],
  );

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, item, position, DEFINITIONS),
  };
}
