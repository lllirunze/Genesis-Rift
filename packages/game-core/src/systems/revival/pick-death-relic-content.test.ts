import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
  type TileId,
} from "@genesis-rift/shared";

import { getCoinBalance } from "../economy/index.ts";
import {
  createItemInstance,
  createPlayerInventory,
  placeItemInBackpack,
  type PlayerInventoryState,
} from "../inventory/index.ts";

import { createDeathRelicState } from "./death-relic-state.ts";
import { pickDeathRelicContent } from "./pick-death-relic-content.ts";

const OWNER_ID = "player_a" as PlayerId;
const VISITOR_ID = "player_b" as PlayerId;
const RELIC_TILE_ID = "tile_000001" as TileId;

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
  item_000002: {
    definitionId: "item_000002",
    name: "Linen",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000003: {
    definitionId: "item_000003",
    name: "Large Crate",
    category: "special",
    quality: "common",
    width: 4,
    height: 6,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("pickDeathRelicContent", () => {
  it("在背包可接收时原子转移遗物物品并记录个人拾取次数", () => {
    const relic = createRelic();

    const result = pickDeathRelicContent({
      relic,
      inventory: createPlayerInventory(VISITOR_ID),
      currentTileId: RELIC_TILE_ID,
      target: { kind: "ITEM", itemInstanceId: "relic-item-1" },
      itemDefinitions: DEFINITIONS,
      newItemInstanceIds: ["visitor-item-1"],
    });

    expect(result).toMatchObject({
      outcome: "PICKED",
      relic: {
        items: [],
        pickupRecords: [{ playerId: VISITOR_ID, pickedUnitCount: 1 }],
      },
      inventory: {
        backpack: {
          entries: [{ item: { instanceId: "visitor-item-1", definitionId: "item_000002" } }],
        },
      },
    });
    expect(relic.items).toHaveLength(1);
  });

  it("在背包和临时拾取区都无法接收时保持遗物与背包不变", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: RELIC_TILE_ID,
      coinQuantity: 0,
      items: [
        {
          instanceId: "relic-large-item",
          definitionId: "item_000003",
          ownerPlayerId: OWNER_ID,
          quantity: 1,
          stackCompatibilityKey: "default",
        },
      ],
    });
    const inventory = createFullInventoryWithTemporaryPickup();

    const result = pickDeathRelicContent({
      relic,
      inventory,
      currentTileId: RELIC_TILE_ID,
      target: { kind: "ITEM", itemInstanceId: "relic-large-item" },
      itemDefinitions: DEFINITIONS,
      newItemInstanceIds: ["visitor-large-item"],
    });

    expect(result).toMatchObject({ outcome: "REJECTED", reason: "INVENTORY_CANNOT_RECEIVE" });
    expect(result.relic).toBe(relic);
    expect(result.inventory).toBe(inventory);
  });

  it("将遗物元宝作为一个内容单位接收并清空遗物元宝", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: RELIC_TILE_ID,
      coinQuantity: 3,
      items: [],
    });

    const result = pickDeathRelicContent({
      relic,
      inventory: createPlayerInventory(VISITOR_ID),
      currentTileId: RELIC_TILE_ID,
      target: { kind: "COIN" },
      itemDefinitions: DEFINITIONS,
      newItemInstanceIds: ["visitor-coin-1"],
    });

    expect(result.outcome).toBe("PICKED");

    if (result.outcome === "PICKED") {
      expect(result.relic.coinQuantity).toBe(0);
      expect(result.relic.pickupRecords).toEqual([{ playerId: VISITOR_ID, pickedUnitCount: 1 }]);
      expect(getCoinBalance(result.inventory)).toBe(3);
    }
  });

  it("拒绝已经达到同一遗物包两次拾取上限的玩家", () => {
    const initialRelic = createRelic();
    const relic = {
      ...initialRelic,
      pickupRecords: [{ playerId: VISITOR_ID, pickedUnitCount: 2 }],
    };

    expect(
      pickDeathRelicContent({
        relic,
        inventory: createPlayerInventory(VISITOR_ID),
        currentTileId: RELIC_TILE_ID,
        target: { kind: "ITEM", itemInstanceId: "relic-item-1" },
        itemDefinitions: DEFINITIONS,
        newItemInstanceIds: ["visitor-item-1"],
      }),
    ).toMatchObject({ outcome: "REJECTED", reason: "PICKUP_LIMIT_REACHED" });
  });
});

/** 创建包含一个普通材料单位的基础遗物包。 */
function createRelic() {
  return createDeathRelicState({
    deathRelicId: "death-relic-1",
    ownerPlayerId: OWNER_ID,
    tileId: RELIC_TILE_ID,
    coinQuantity: 0,
    items: [
      {
        instanceId: "relic-item-1",
        definitionId: "item_000002",
        ownerPlayerId: OWNER_ID,
        quantity: 1,
        stackCompatibilityKey: "default",
      },
    ],
  });
}

/** 创建已被 4×6 物品占满且临时拾取区已有内容的一级背包。 */
function createFullInventoryWithTemporaryPickup(): PlayerInventoryState {
  const inventory = createPlayerInventory(VISITOR_ID);
  const largeItem = createItemInstance(
    {
      instanceId: "occupied-large-item",
      definitionId: "item_000003",
      ownerPlayerId: VISITOR_ID,
    },
    DEFINITIONS.item_000003,
  );
  const temporaryItem = createItemInstance(
    {
      instanceId: "temporary-item",
      definitionId: "item_000002",
      ownerPlayerId: VISITOR_ID,
    },
    DEFINITIONS.item_000002,
  );

  return {
    backpack: placeItemInBackpack(inventory.backpack, largeItem, { x: 0, y: 0 }, DEFINITIONS),
    temporaryPickup: {
      item: temporaryItem,
      sourceId: "test-source",
      remainingOwnerTurns: 3,
    },
  };
}
