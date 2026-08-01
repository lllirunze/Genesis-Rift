import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { placeItemInBackpack } from "../inventory/backpack-operations.ts";
import { getBackpackEntry } from "../inventory/backpack-state.ts";
import { createItemInstance } from "../inventory/item-instance.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { canAffordCoin, getCoinBalance, receiveCoin, spendCoin } from "./coin.ts";

const PLAYER_ID = "player-1" as PlayerId;

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

describe("Coin economy", () => {
  it("treats each stored item quantity as exactly one Coin", () => {
    const received = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 7,
        sourceId: "rule.unit-value",
        newItemInstanceIds: ["coin-1", "coin-2"],
      },
      DEFINITIONS,
    ).inventory;

    expect(received.backpack.entries.map((entry) => entry.item.quantity)).toEqual([5, 2]);
    expect(getCoinBalance(received)).toBe(7);

    const payment = spendCoin(received, {
      coinQuantity: 3,
      reasonId: "rule.unit-value-payment",
    });

    expect(payment.remainingBalance).toBe(4);
    expect(getCoinBalance(payment.inventory)).toBe(4);
    expect(payment.payment.coinQuantity).toBe(3);
  });

  it("receives Coin through the standard item flow and derives balance from backpack stacks", () => {
    const result = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 12,
        sourceId: "quest.reward",
        newItemInstanceIds: ["coin-1", "coin-2", "coin-3"],
      },
      DEFINITIONS,
    );

    expect(result.backpackQuantityAdded).toBe(12);
    expect(result.inventory.backpack.entries.map((entry) => entry.item.quantity)).toEqual([
      5, 5, 2,
    ]);
    expect(getCoinBalance(result.inventory)).toBe(12);
    expect(canAffordCoin(result.inventory, 12)).toBe(true);
    expect(canAffordCoin(result.inventory, 13)).toBe(false);
  });

  it("spends stacks in coordinate order and returns an auditable payment record", () => {
    const received = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 12,
        sourceId: "event.reward",
        newItemInstanceIds: ["coin-1", "coin-2", "coin-3"],
      },
      DEFINITIONS,
    ).inventory;
    const result = spendCoin(received, {
      coinQuantity: 7,
      reasonId: "blacksmith.craft-fee",
    });

    expect(result.remainingBalance).toBe(5);
    expect(result.payment).toEqual({
      playerId: PLAYER_ID,
      coinQuantity: 7,
      reasonId: "blacksmith.craft-fee",
      consumedItemInstanceIds: ["coin-1", "coin-2"],
    });
    expect(result.inventory.backpack.entries.map((entry) => entry.item.instanceId)).toEqual([
      "coin-2",
      "coin-3",
    ]);
    expect(getBackpackEntry(result.inventory.backpack, "coin-2").item.quantity).toBe(3);
    expect(getBackpackEntry(result.inventory.backpack, "coin-3").item.quantity).toBe(2);
    expect(getCoinBalance(received)).toBe(12);
  });

  it("keeps the original inventory unchanged when the balance is insufficient", () => {
    const inventory = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 4,
        sourceId: "battle.reward",
        newItemInstanceIds: ["coin-1"],
      },
      DEFINITIONS,
    ).inventory;

    expect(() => spendCoin(inventory, { coinQuantity: 5, reasonId: "shop.purchase" })).toThrow(
      "Insufficient Coin",
    );
    expect(getCoinBalance(inventory)).toBe(4);
    expect(getBackpackEntry(inventory.backpack, "coin-1").item.quantity).toBe(4);
  });

  it("does not count or spend Coin held in the temporary pickup", () => {
    const blocker = createItemInstance(
      {
        instanceId: "blocker-1",
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
    const inventory = receiveCoin(
      fullInventory,
      {
        quantity: 5,
        sourceId: "event.reward",
        newItemInstanceIds: ["coin-temporary"],
      },
      DEFINITIONS,
    ).inventory;

    expect(inventory.temporaryPickup?.item.quantity).toBe(5);
    expect(getCoinBalance(inventory)).toBe(0);
    expect(canAffordCoin(inventory, 1)).toBe(false);
    expect(() => spendCoin(inventory, { coinQuantity: 1, reasonId: "shop.purchase" })).toThrow(
      "Insufficient Coin",
    );
  });

  it("supports a zero-cost payment and rejects invalid quantities or reasons", () => {
    const inventory = createPlayerInventory(PLAYER_ID);
    const freePayment = spendCoin(inventory, {
      coinQuantity: 0,
      reasonId: "service.free",
    });

    expect(freePayment.remainingBalance).toBe(0);
    expect(freePayment.payment.consumedItemInstanceIds).toEqual([]);
    expect(() => canAffordCoin(inventory, -1)).toThrow(TypeError);
    expect(() => spendCoin(inventory, { coinQuantity: 0.5, reasonId: "service.invalid" })).toThrow(
      TypeError,
    );
    expect(() => spendCoin(inventory, { coinQuantity: 0, reasonId: "" })).toThrow(TypeError);
  });
});
