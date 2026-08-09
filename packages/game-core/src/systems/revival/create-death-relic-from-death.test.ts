import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
  type TileId,
} from "@genesis-rift/shared";

import { getCoinBalance, receiveCoin } from "../economy/index.ts";
import {
  createEmptyEquipmentLoadout,
  createEquipmentInstance,
  type EquipmentLoadout,
} from "../equipment/index.ts";
import {
  createItemInstance,
  createPlayerInventory,
  placeItemInBackpack,
  type PlayerInventoryState,
} from "../inventory/index.ts";
import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import { createDeathRelicFromDeath } from "./create-death-relic-from-death.ts";

const PLAYER_ID = "player_a" as PlayerId;
const DEATH_TILE_ID = "tile_000001" as TileId;

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
    name: "Rare Herb",
    category: "material",
    quality: "rare",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  equip_000001: {
    definitionId: "equip_000001",
    name: "Iron Sword",
    category: "equipment",
    quality: "excellent",
    width: 1,
    height: 3,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

describe("createDeathRelicFromDeath", () => {
  it("清除临时拾取区、扣除元宝并将唯一合格物品写入死亡遗物包", () => {
    let inventory = createPlayerInventory(PLAYER_ID);
    inventory = receiveCoin(
      inventory,
      {
        quantity: 10,
        sourceId: "test",
        newItemInstanceIds: ["coin-1", "coin-2"],
      },
      DEFINITIONS,
    ).inventory;
    inventory = addBackpackItem(inventory, "material-1", "item_000002", { x: 2, y: 0 });
    inventory = addBackpackItem(inventory, "rare-material-1", "item_000003", { x: 3, y: 0 });
    inventory = {
      ...inventory,
      temporaryPickup: {
        item: createItemInstance(
          {
            instanceId: "temporary-material-1",
            definitionId: "item_000002",
            ownerPlayerId: PLAYER_ID,
          },
          DEFINITIONS.item_000002,
        ),
        sourceId: "test-temporary",
        remainingOwnerTurns: 3,
      },
    };

    const result = createDeathRelicFromDeath({
      deathRelicId: "death-relic-1",
      ownerPlayerId: PLAYER_ID,
      deathTileId: DEATH_TILE_ID,
      inventory,
      equipmentLoadout: createEmptyEquipmentLoadout(PLAYER_ID),
      itemDefinitions: DEFINITIONS,
      randomStream: createLootStream(),
    });

    expect(result.relic).toMatchObject({
      coinQuantity: 2,
      items: [{ instanceId: "material-1" }],
    });
    expect(result.discardedTemporaryPickup?.instanceId).toBe("temporary-material-1");
    expect(result.inventory.temporaryPickup).toBeNull();
    expect(getCoinBalance(result.inventory)).toBe(8);
    expect(result.inventory.backpack.entries.map((entry) => entry.item.instanceId)).toContain(
      "rare-material-1",
    );
    expect(result.inventory.backpack.entries.map((entry) => entry.item.instanceId)).not.toContain(
      "material-1",
    );
  });

  it("允许普通或优秀品质的已穿戴装备作为唯一损失候选并从装备栏移除", () => {
    const equipment = createEquipmentInstance({
      instanceId: "equipment-1",
      definitionId: "equip_000001",
      ownerPlayerId: PLAYER_ID,
    });
    const loadout: EquipmentLoadout = {
      ...createEmptyEquipmentLoadout(PLAYER_ID),
      slots: {
        ...createEmptyEquipmentLoadout(PLAYER_ID).slots,
        weapon: equipment,
      },
    };

    const result = createDeathRelicFromDeath({
      deathRelicId: "death-relic-1",
      ownerPlayerId: PLAYER_ID,
      deathTileId: DEATH_TILE_ID,
      inventory: createPlayerInventory(PLAYER_ID),
      equipmentLoadout: loadout,
      itemDefinitions: DEFINITIONS,
      randomStream: createLootStream(),
    });

    expect(result.relic.items).toMatchObject([{ instanceId: "equipment-1" }]);
    expect(result.lostItem).toMatchObject({ location: "EQUIPMENT", equipmentSlot: "weapon" });
    expect(result.equipmentLoadout.slots.weapon).toBeNull();
  });
});

/** 创建用于固定测试结果的掉落随机流。 */
function createLootStream(): RandomStream {
  return RandomStream.create(
    "loot",
    "death-relic-test",
    createRandomStreamSeed("0123456789abcdef"),
  );
}

/** 向指定背包位置加入一个独立物品实例。 */
function addBackpackItem(
  inventory: PlayerInventoryState,
  instanceId: string,
  definitionId: "item_000002" | "item_000003",
  position: { readonly x: number; readonly y: number },
): PlayerInventoryState {
  const definition = DEFINITIONS[definitionId];
  const item = createItemInstance(
    {
      instanceId,
      definitionId,
      ownerPlayerId: PLAYER_ID,
    },
    definition,
  );

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, item, position, DEFINITIONS),
  };
}
