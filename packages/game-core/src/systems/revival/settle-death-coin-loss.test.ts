import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { getCoinBalance, receiveCoin } from "../economy/index.ts";
import { createPlayerInventory } from "../inventory/index.ts";

import { settleDeathCoinLoss } from "./settle-death-coin-loss.ts";

const PLAYER_ID = "player_a" as PlayerId;

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
} as const satisfies ItemDefinitionCatalog;

describe("settle death coin loss", () => {
  it("从背包实际扣除按百分之二十向下取整的元宝", () => {
    const inventory = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 19,
        sourceId: "fixture.coin",
        newItemInstanceIds: ["coin-1", "coin-2", "coin-3", "coin-4"],
      },
      DEFINITIONS,
    ).inventory;
    const result = settleDeathCoinLoss(inventory);

    expect(result.loss).toMatchObject({ lostCoinQuantity: 3, remainingCoinQuantity: 16 });
    expect(result.payment).toMatchObject({
      playerId: PLAYER_ID,
      coinQuantity: 3,
      reasonId: "revival.death-coin-loss",
    });
    expect(getCoinBalance(result.inventory)).toBe(16);
  });

  it("零损失时保持背包不变并生成零数量账本记录", () => {
    const inventory = createPlayerInventory(PLAYER_ID);
    const result = settleDeathCoinLoss(inventory);

    expect(result.inventory).toEqual(inventory);
    expect(result.payment).toMatchObject({ coinQuantity: 0, consumedItemInstanceIds: [] });
  });
});
