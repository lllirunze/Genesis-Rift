import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import { receiveCoin } from "../economy/coin.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import type { BlueprintDefinition } from "../crafting/blueprint-definition.ts";
import { craftAtNpc } from "./craft-at-npc.ts";

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

const BLACKSMITH = {
  definitionId: "npc_000001",
  name: "blacksmith",
  services: [
    {
      serviceType: "crafting",
      requiredConditionIds: ["condition_000001"],
      requiredEnvironmentTags: ["day"],
    },
  ],
} as const;

const PLAYER_ID = "player-1" as PlayerId;
const TOWN_TILE_ID = "tile-town" as TileId;

describe("craftAtNpc", () => {
  it("uses the blacksmith service condition before delegating to the atomic crafting flow", () => {
    const materialInventory = receiveItem(
      createPlayerInventory(PLAYER_ID),
      {
        definitionId: "item_000002",
        quantity: 3,
        sourceId: "event_000001",
        newItemInstanceIds: ["ore-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const inventory = receiveCoin(
      materialInventory,
      {
        quantity: 4,
        sourceId: "event_000001",
        newItemInstanceIds: ["coin-1"],
        allowTemporaryStorage: false,
      },
      ITEM_DEFINITIONS,
    ).inventory;
    const result = craftAtNpc({
      playerTileId: TOWN_TILE_ID,
      environmentTags: ["day"],
      npcDefinition: BLACKSMITH,
      npcState: {
        npcId: "npc-instance-1",
        definitionId: "npc_000001",
        currentTileId: TOWN_TILE_ID,
        available: true,
      },
      inventory,
      blueprints: { knownBlueprintIds: ["blueprint_000001"] },
      blueprint: LONG_SWORD_BLUEPRINT,
      craftInput: {
        transactionId: "craft_000001",
        productItemInstanceIds: ["sword-1"],
        satisfiedConditionIds: ["condition_000001"],
      },
      itemDefinitions: ITEM_DEFINITIONS,
    });

    expect(result.interacted).toBe(true);

    if (!result.interacted) {
      return;
    }

    expect(result.craft).toMatchObject({ crafted: true, craftedItemDefinitionId: "equip_000001" });
  });

  it("keeps the original inventory when the blacksmith service condition is unmet", () => {
    const inventory = createPlayerInventory(PLAYER_ID);
    const result = craftAtNpc({
      playerTileId: TOWN_TILE_ID,
      environmentTags: ["day"],
      npcDefinition: BLACKSMITH,
      npcState: {
        npcId: "npc-instance-1",
        definitionId: "npc_000001",
        currentTileId: TOWN_TILE_ID,
        available: true,
      },
      inventory,
      blueprints: { knownBlueprintIds: ["blueprint_000001"] },
      blueprint: LONG_SWORD_BLUEPRINT,
      craftInput: {
        transactionId: "craft_000001",
        productItemInstanceIds: ["sword-1"],
        satisfiedConditionIds: [],
      },
      itemDefinitions: ITEM_DEFINITIONS,
    });

    expect(result).toMatchObject({
      interacted: false,
      reason: "unmet-service-condition",
      missingConditionIds: ["condition_000001"],
    });

    if (result.interacted) {
      return;
    }

    expect(result.inventory).toBe(inventory);
  });
});
