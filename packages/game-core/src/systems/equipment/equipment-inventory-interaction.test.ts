import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { placeItemInBackpack } from "../inventory/backpack-operations.ts";
import { getBackpackEntry } from "../inventory/backpack-state.ts";
import { createItemInstance } from "../inventory/item-instance.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import type { EquipmentDefinitionCatalog } from "./equipment-attribute-modifiers.ts";
import {
  equipItemFromBackpack,
  type EquipmentInventoryState,
  unequipItemToBackpack,
} from "./equipment-inventory-interaction.ts";
import { createEquipmentInstance } from "./equipment-instance.ts";
import { createEmptyEquipmentLoadout, equipEquipment } from "./equipment-loadout.ts";

const PLAYER_ID = "player-1" as PlayerId;

const ITEM_DEFINITIONS = {
  "item.equipment.training-sword": {
    definitionId: "item.equipment.training-sword",
    name: "Training Sword",
    category: "equipment",
    quality: "common",
    width: 2,
    height: 4,
    maximumStack: 1,
  },
  "item.equipment.battle-axe": {
    definitionId: "item.equipment.battle-axe",
    name: "Battle Axe",
    category: "equipment",
    quality: "excellent",
    width: 2,
    height: 3,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

const EQUIPMENT_DEFINITIONS = {
  "item.equipment.training-sword": {
    definitionId: "item.equipment.training-sword",
    name: "Training Sword",
    type: "weapon",
    quality: "common",
    corePosition: "A basic physical weapon.",
    allowDuplicateEquipping: false,
    attributeEffects: [],
  },
  "item.equipment.battle-axe": {
    definitionId: "item.equipment.battle-axe",
    name: "Battle Axe",
    type: "weapon",
    quality: "excellent",
    corePosition: "A heavy physical weapon.",
    allowDuplicateEquipping: false,
    attributeEffects: [],
  },
} as const satisfies EquipmentDefinitionCatalog;

describe("equipment and inventory interaction", () => {
  it("equips an item from the backpack without losing its instance metadata", () => {
    const state = createStateWithBackpackItem("item.equipment.training-sword", "sword-1", {
      x: 0,
      y: 0,
    });
    const result = equipItemFromBackpack(
      state,
      { itemInstanceId: "sword-1", slot: "weapon" },
      ITEM_DEFINITIONS,
      EQUIPMENT_DEFINITIONS,
    );

    expect(result.inventory.backpack.entries).toEqual([]);
    expect(result.loadout.slots.weapon).toEqual({
      instanceId: "sword-1",
      definitionId: "item.equipment.training-sword",
      ownerPlayerId: PLAYER_ID,
      quantity: 1,
      stackCompatibilityKey: "bound.player-1",
    });
    expect(state.inventory.backpack.entries).toHaveLength(1);
    expect(state.loadout.slots.weapon).toBeNull();
  });

  it("unequips an item to the requested backpack position", () => {
    const initial = createStateWithBackpackItem("item.equipment.training-sword", "sword-1", {
      x: 0,
      y: 0,
    });
    const equipped = equipItemFromBackpack(
      initial,
      { itemInstanceId: "sword-1", slot: "weapon" },
      ITEM_DEFINITIONS,
      EQUIPMENT_DEFINITIONS,
    );
    const result = unequipItemToBackpack(
      equipped,
      { slot: "weapon", targetPosition: { x: 2, y: 1 } },
      ITEM_DEFINITIONS,
      EQUIPMENT_DEFINITIONS,
    );

    expect(result.loadout.slots.weapon).toBeNull();
    expect(getBackpackEntry(result.inventory.backpack, "sword-1")).toMatchObject({
      position: { x: 2, y: 1 },
      item: {
        quantity: 1,
        stackCompatibilityKey: "bound.player-1",
      },
    });
  });

  it("atomically replaces equipment and returns the previous item to the freed space", () => {
    const oldEquipment = createEquipmentInstance({
      instanceId: "sword-1",
      definitionId: "item.equipment.training-sword",
      ownerPlayerId: PLAYER_ID,
      stackCompatibilityKey: "worn",
    });
    const initialLoadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "weapon",
      oldEquipment,
      EQUIPMENT_DEFINITIONS["item.equipment.training-sword"],
    ).loadout;
    const state = {
      ...createStateWithBackpackItem("item.equipment.battle-axe", "axe-1", { x: 1, y: 2 }),
      loadout: initialLoadout,
    };
    const result = equipItemFromBackpack(
      state,
      {
        itemInstanceId: "axe-1",
        slot: "weapon",
        replacedEquipmentPosition: { x: 1, y: 2 },
      },
      ITEM_DEFINITIONS,
      EQUIPMENT_DEFINITIONS,
    );

    expect(result.loadout.slots.weapon?.instanceId).toBe("axe-1");
    expect(result.inventory.backpack.entries).toHaveLength(1);
    expect(getBackpackEntry(result.inventory.backpack, "sword-1")).toMatchObject({
      position: { x: 1, y: 2 },
      item: { stackCompatibilityKey: "worn" },
    });
  });

  it("keeps both original states unchanged when replacement cannot return the old item", () => {
    const oldEquipment = createEquipmentInstance({
      instanceId: "sword-1",
      definitionId: "item.equipment.training-sword",
      ownerPlayerId: PLAYER_ID,
    });
    const initialLoadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "weapon",
      oldEquipment,
      EQUIPMENT_DEFINITIONS["item.equipment.training-sword"],
    ).loadout;
    const state = {
      ...createStateWithBackpackItem("item.equipment.battle-axe", "axe-1", { x: 0, y: 0 }),
      loadout: initialLoadout,
    };

    expect(() =>
      equipItemFromBackpack(
        state,
        {
          itemInstanceId: "axe-1",
          slot: "weapon",
          replacedEquipmentPosition: { x: 3, y: 5 },
        },
        ITEM_DEFINITIONS,
        EQUIPMENT_DEFINITIONS,
      ),
    ).toThrow("cannot be placed");
    expect(state.loadout.slots.weapon).toBe(oldEquipment);
    expect(getBackpackEntry(state.inventory.backpack, "axe-1").position).toEqual({ x: 0, y: 0 });
  });

  it("requires a return position when replacing equipment and rejects an empty unequip slot", () => {
    const oldEquipment = createEquipmentInstance({
      instanceId: "sword-1",
      definitionId: "item.equipment.training-sword",
      ownerPlayerId: PLAYER_ID,
    });
    const state = {
      ...createStateWithBackpackItem("item.equipment.battle-axe", "axe-1", { x: 0, y: 0 }),
      loadout: equipEquipment(
        createEmptyEquipmentLoadout(PLAYER_ID),
        "weapon",
        oldEquipment,
        EQUIPMENT_DEFINITIONS["item.equipment.training-sword"],
      ).loadout,
    };

    expect(() =>
      equipItemFromBackpack(
        state,
        { itemInstanceId: "axe-1", slot: "weapon" },
        ITEM_DEFINITIONS,
        EQUIPMENT_DEFINITIONS,
      ),
    ).toThrow("replacedEquipmentPosition is required");
    expect(() =>
      unequipItemToBackpack(
        createEmptyState(),
        { slot: "armor", targetPosition: { x: 0, y: 0 } },
        ITEM_DEFINITIONS,
        EQUIPMENT_DEFINITIONS,
      ),
    ).toThrow("Equipment slot is empty");
  });
});

/**
 * 方法名：createStateWithBackpackItem
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createStateWithBackpackItem(
  definitionId: keyof typeof ITEM_DEFINITIONS,
  instanceId: string,
  position: { readonly x: number; readonly y: number },
): EquipmentInventoryState {
  const state = createEmptyState();
  const item = createItemInstance(
    {
      instanceId,
      definitionId,
      ownerPlayerId: PLAYER_ID,
      stackCompatibilityKey: "bound.player-1",
    },
    ITEM_DEFINITIONS[definitionId],
  );

  return {
    ...state,
    inventory: {
      ...state.inventory,
      backpack: placeItemInBackpack(state.inventory.backpack, item, position, ITEM_DEFINITIONS),
    },
  };
}

/**
 * 方法名：createEmptyState
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createEmptyState(): EquipmentInventoryState {
  return {
    inventory: createPlayerInventory(PLAYER_ID),
    loadout: createEmptyEquipmentLoadout(PLAYER_ID),
  };
}
