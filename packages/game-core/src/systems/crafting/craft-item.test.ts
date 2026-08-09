import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { receiveCoin } from "../economy/coin.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import type { BlueprintDefinition } from "./blueprint-definition.ts";
import { craftItem } from "./craft-item.ts";
import { learnBlueprintFromInventory } from "./learn-blueprint.ts";
import { createPlayerBlueprintState } from "./player-blueprint-state.ts";

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
  item_000002: {
    definitionId: "item_000002",
    name: "Iron Ore",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000003: {
    definitionId: "item_000003",
    name: "Long Sword Blueprint",
    category: "special",
    quality: "excellent",
    width: 1,
    height: 2,
    maximumStack: 1,
  },
  equip_000001: {
    definitionId: "equip_000001",
    name: "Long Sword",
    category: "equipment",
    quality: "excellent",
    width: 2,
    height: 4,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

const LONG_SWORD_BLUEPRINT = {
  blueprintId: "blueprint_000001",
  sourceItemDefinitionId: "item_000003",
  name: "Long Sword Blueprint",
  productItemDefinitionId: "equip_000001",
  materialRequirements: [{ itemDefinitionId: "item_000002", quantity: 3 }],
  coinCost: 4,
  requiredConditionIds: [],
} as const satisfies BlueprintDefinition;

const PLAYER_ID = "player-1" as PlayerId;

describe("craftItem", () => {
  it("learns a blueprint once and atomically crafts its product into the formal backpack", () => {
    const inventoryWithBlueprint = receiveItem(
      createPlayerInventory(PLAYER_ID),
      {
        definitionId: "item_000003",
        quantity: 1,
        sourceId: "event_000001",
        newItemInstanceIds: ["blueprint-item-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const learned = learnBlueprintFromInventory(
      inventoryWithBlueprint,
      createPlayerBlueprintState(),
      LONG_SWORD_BLUEPRINT,
      { sourceId: "event_000001" },
      ITEM_DEFINITIONS,
    );
    const inventoryWithMaterials = receiveItem(
      learned.inventory,
      {
        definitionId: "item_000002",
        quantity: 3,
        sourceId: "event_000001",
        newItemInstanceIds: ["ore-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const preparedInventory = receiveCoin(
      inventoryWithMaterials,
      {
        quantity: 4,
        sourceId: "event_000001",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;

    const result = craftItem(
      preparedInventory,
      learned.blueprints,
      LONG_SWORD_BLUEPRINT,
      {
        transactionId: "craft_000001",
        productItemInstanceIds: ["sword-1"],
        satisfiedConditionIds: [],
      },
      ITEM_DEFINITIONS,
    );

    expect(result.crafted).toBe(true);

    if (!result.crafted) {
      return;
    }

    expect(result.inventory.backpack.entries.map((entry) => entry.item.definitionId)).toEqual([
      "equip_000001",
    ]);
    expect(result.payment.coinQuantity).toBe(4);
    expect(result.consumedMaterialItemInstanceIds).toEqual(["ore-1"]);
  });

  it("does not consume materials or coin when the formal backpack cannot receive the product", () => {
    const initialInventory = createPlayerInventory(PLAYER_ID);
    const materialInventory = receiveItem(
      initialInventory,
      {
        definitionId: "item_000002",
        quantity: 3,
        sourceId: "event_000001",
        newItemInstanceIds: ["ore-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const inventoryWithCoin = receiveCoin(
      materialInventory,
      {
        quantity: 4,
        sourceId: "event_000001",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const fullInventory = fillBackpack(inventoryWithCoin);
    const blueprints = { knownBlueprintIds: [LONG_SWORD_BLUEPRINT.blueprintId] };

    const result = craftItem(
      fullInventory,
      blueprints,
      LONG_SWORD_BLUEPRINT,
      {
        transactionId: "craft_000001",
        productItemInstanceIds: ["sword-1"],
        satisfiedConditionIds: [],
      },
      ITEM_DEFINITIONS,
    );

    expect(result).toMatchObject({ crafted: false, reason: "insufficient-backpack-space" });
    expect(result.inventory).toBe(fullInventory);
  });
});

/** 将一级背包填满，确保 2 x 4 装备没有连续空间可用。 */
function fillBackpack(inventory: ReturnType<typeof createPlayerInventory>) {
  let currentInventory = inventory;
  const missingSlotCount = 24 - currentInventory.backpack.entries.length;

  for (let index = 0; index < missingSlotCount; index += 1) {
    currentInventory = receiveItem(
      currentInventory,
      {
        definitionId: "item_000002",
        quantity: 1,
        sourceId: "event_000001",
        newItemInstanceIds: [`blocker-${index}`],
        allowTemporaryStorage: false,
        stackCompatibilityKey: `blocker-${index}`,
      },
      ITEM_DEFINITIONS,
    ).inventory;
  }

  return currentInventory;
}
