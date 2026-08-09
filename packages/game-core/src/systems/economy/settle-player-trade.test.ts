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
import { getCoinBalance, receiveCoin } from "./coin.ts";
import { confirmPlayerTrade, createPlayerTradeState } from "./player-trade-state.ts";
import { settleConfirmedPlayerTrade } from "./settle-player-trade.ts";

const INITIATOR_ID = "player-initiator" as PlayerId;
const RECIPIENT_ID = "player-recipient" as PlayerId;

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
  item_000101: {
    definitionId: "item_000101",
    name: "Linen",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000102: {
    definitionId: "item_000102",
    name: "Healing Potion",
    category: "consumable",
    quality: "common",
    width: 1,
    height: 2,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("settleConfirmedPlayerTrade", () => {
  it("atomically exchanges formal backpack items and Coin after both players confirm", () => {
    const initiatorInventory = createInventory(
      INITIATOR_ID,
      "item-instance-linen",
      "item_000101",
      "coin-initiator",
      7,
    );
    const recipientInventory = createInventory(
      RECIPIENT_ID,
      "item-instance-potion",
      "item_000102",
      "coin-recipient",
      2,
    );
    const pendingTrade = createPlayerTradeState(
      "trade-runtime-001",
      INITIATOR_ID,
      RECIPIENT_ID,
      { itemInstanceIds: ["item-instance-linen"], coin: 2 },
      { itemInstanceIds: ["item-instance-potion"], coin: 1 },
      10,
    );
    const confirmedTrade = confirmPlayerTrade(
      confirmPlayerTrade(pendingTrade, INITIATOR_ID, 1),
      RECIPIENT_ID,
      1,
    );

    const result = settleConfirmedPlayerTrade(
      confirmedTrade,
      initiatorInventory,
      recipientInventory,
      { initiatorReceiptIds: [], recipientReceiptIds: [] },
      DEFINITIONS,
    );

    expect(result.trade.status).toBe("SETTLED");
    expect(getCoinBalance(result.initiatorInventory)).toBe(6);
    expect(getCoinBalance(result.recipientInventory)).toBe(3);
    expect(
      getBackpackEntry(result.initiatorInventory.backpack, "item-instance-potion").item,
    ).toMatchObject({
      ownerPlayerId: INITIATOR_ID,
      definitionId: "item_000102",
    });
    expect(
      getBackpackEntry(result.recipientInventory.backpack, "item-instance-linen").item,
    ).toMatchObject({
      ownerPlayerId: RECIPIENT_ID,
      definitionId: "item_000101",
    });
    expect(getCoinBalance(initiatorInventory)).toBe(7);
    expect(getCoinBalance(recipientInventory)).toBe(2);
    expect(
      getBackpackEntry(initiatorInventory.backpack, "item-instance-linen").item.ownerPlayerId,
    ).toBe(INITIATOR_ID);
  });

  it("leaves source snapshots unchanged when a quoted item is no longer in the formal backpack", () => {
    const initiatorInventory = createPlayerInventory(INITIATOR_ID);
    const recipientInventory = createPlayerInventory(RECIPIENT_ID);
    const pendingTrade = createPlayerTradeState(
      "trade-runtime-002",
      INITIATOR_ID,
      RECIPIENT_ID,
      { itemInstanceIds: ["missing-item"], coin: 0 },
      { itemInstanceIds: [], coin: 0 },
      10,
    );
    const confirmedTrade = confirmPlayerTrade(
      confirmPlayerTrade(pendingTrade, INITIATOR_ID, 1),
      RECIPIENT_ID,
      1,
    );

    expect(() =>
      settleConfirmedPlayerTrade(
        confirmedTrade,
        initiatorInventory,
        recipientInventory,
        { initiatorReceiptIds: [], recipientReceiptIds: [] },
        DEFINITIONS,
      ),
    ).toThrow("Backpack item not found: missing-item");
    expect(initiatorInventory.backpack.entries).toEqual([]);
    expect(recipientInventory.backpack.entries).toEqual([]);
  });
});

/** 创建含一个正式物品和指定元宝余额的测试背包。 */
function createInventory(
  playerId: PlayerId,
  itemInstanceId: string,
  itemDefinitionId: "item_000101" | "item_000102",
  coinInstanceId: string,
  coinQuantity: number,
) {
  const baseInventory = createPlayerInventory(playerId);
  const item = createItemInstance(
    { instanceId: itemInstanceId, definitionId: itemDefinitionId, ownerPlayerId: playerId },
    DEFINITIONS[itemDefinitionId],
  );
  const withItem = {
    ...baseInventory,
    backpack: placeItemInBackpack(baseInventory.backpack, item, { x: 0, y: 0 }, DEFINITIONS),
  };

  return receiveCoin(
    withItem,
    {
      quantity: coinQuantity,
      sourceId: "test.initial-coin",
      newItemInstanceIds: [coinInstanceId, `${coinInstanceId}-extra`],
      allowTemporaryStorage: false,
    },
    DEFINITIONS,
  ).inventory;
}
