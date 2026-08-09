import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import { receiveCoin } from "../economy/coin.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { purchaseFromNpcShop } from "./purchase-from-npc-shop.ts";

const ITEM_DEFINITIONS = {
  item_000001: {
    definitionId: "item_000001",
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000005: {
    definitionId: "item_000005",
    name: "Healing Potion",
    category: "consumable",
    quality: "common",
    width: 1,
    height: 2,
    maximumStack: 3,
  },
  item_000007: {
    definitionId: "item_000007",
    name: "Antidote",
    category: "consumable",
    quality: "excellent",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const satisfies ItemDefinitionCatalog;

const MERCHANT = {
  definitionId: "npc_000002",
  name: "merchant",
  services: [{ serviceType: "shop", requiredConditionIds: [], shopDefinitionId: "shop_000001" }],
} as const;

const SHOP_DEFINITIONS = {
  shop_000001: {
    definitionId: "shop_000001",
    name: "frontierSupplyShop",
    items: [
      { itemDefinitionId: "item_000005", unitCoinPrice: 2 },
      { itemDefinitionId: "item_000007", unitCoinPrice: 4 },
    ],
  },
} as const;

const PLAYER_ID = "player-1" as PlayerId;
const TOWN_TILE_ID = "tile-town" as TileId;

describe("purchaseFromNpcShop", () => {
  it("calculates the batch price and delegates an atomic purchase to the economy system", () => {
    const inventory = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      {
        quantity: 4,
        sourceId: "event_000001",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const result = purchaseFromNpcShop({
      playerTileId: TOWN_TILE_ID,
      npcDefinition: MERCHANT,
      npcState: {
        npcId: "npc-instance-1",
        definitionId: "npc_000002",
        currentTileId: TOWN_TILE_ID,
        available: true,
      },
      shopDefinitions: SHOP_DEFINITIONS,
      inventory,
      transactionId: "shop_000001",
      itemDefinitionId: "item_000005",
      itemQuantity: 2,
      newItemInstanceIds: ["potion-1"],
      itemDefinitions: ITEM_DEFINITIONS,
    });

    expect(result.purchased).toBe(true);

    if (!result.purchased) {
      return;
    }

    expect(result.purchase).toMatchObject({
      purchased: true,
      totalCoinPrice: 4,
      purchasedQuantity: 2,
      currentCoinBalance: 0,
    });
  });

  it("does not change the inventory when the selected item is not sold by the shop", () => {
    const inventory = createPlayerInventory(PLAYER_ID);
    const result = purchaseFromNpcShop({
      playerTileId: TOWN_TILE_ID,
      npcDefinition: MERCHANT,
      npcState: {
        npcId: "npc-instance-1",
        definitionId: "npc_000002",
        currentTileId: TOWN_TILE_ID,
        available: true,
      },
      shopDefinitions: SHOP_DEFINITIONS,
      inventory,
      transactionId: "shop_000001",
      itemDefinitionId: "item_000001",
      itemQuantity: 1,
      newItemInstanceIds: ["coin-2"],
      itemDefinitions: ITEM_DEFINITIONS,
    });

    expect(result).toMatchObject({ purchased: false, reason: "item-unavailable" });

    if (result.purchased) {
      return;
    }

    expect(result.inventory).toBe(inventory);
  });
});
