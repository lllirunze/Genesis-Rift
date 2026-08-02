import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { createEquipmentInstance } from "../equipment/equipment-instance.ts";
import { createEmptyEquipmentLoadout } from "../equipment/equipment-loadout.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { createItemInstance } from "./item-instance.ts";
import { createBackpackView, type BackpackRevealGrant } from "./inventory-visibility.ts";
import { createPlayerInventory } from "./player-inventory-state.ts";
import { createPlayerItemView } from "./player-item-view.ts";

const OWNER_ID = "player-owner" as PlayerId;
const VIEWER_ID = "player-viewer" as PlayerId;
const OTHER_VIEWER_ID = "player-other" as PlayerId;
const POTION_DEFINITION_ID = "item.consumable.secret-potion";

const ITEM_DEFINITIONS = {
  [POTION_DEFINITION_ID]: {
    definitionId: POTION_DEFINITION_ID,
    name: "Secret Potion",
    category: "consumable",
    quality: "rare",
    width: 1,
    height: 2,
    maximumStack: 3,
  },
} as const satisfies ItemDefinitionCatalog;

describe("inventory visibility", () => {
  it("returns complete backpack information to its owner", () => {
    const inventory = createInventory();
    const view = createBackpackView({
      backpack: inventory.backpack,
      viewerPlayerId: OWNER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 10,
    });

    expect(view.visibility).toBe("full");

    if (view.visibility !== "full") {
      throw new Error("Expected a full backpack view");
    }

    expect(view.revealGrantId).toBeNull();
    expect(view.entries[0]).toMatchObject({
      item: {
        instanceId: "item-instance.secret-potion",
        definitionId: POTION_DEFINITION_ID,
        quantity: 2,
      },
      position: { x: 1, y: 2 },
    });
  });

  it("returns only anonymous occupied rectangles to other players", () => {
    const inventory = createInventory();
    const view = createBackpackView({
      backpack: inventory.backpack,
      viewerPlayerId: VIEWER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 10,
    });

    expect(view).toEqual({
      visibility: "masked",
      ownerPlayerId: OWNER_ID,
      level: 1,
      gridWidth: 6,
      gridHeight: 8,
      usableWidth: 4,
      usableHeight: 6,
      entries: [
        {
          maskId: "mask-1-2",
          position: { x: 1, y: 2 },
          width: 1,
          height: 2,
        },
      ],
    });
    expect(JSON.stringify(view)).not.toContain(POTION_DEFINITION_ID);
    expect(JSON.stringify(view)).not.toContain("Secret Potion");
    expect(JSON.stringify(view)).not.toContain("rare");
  });

  it("temporarily reveals a backpack only to the granted viewer", () => {
    const inventory = createInventory();
    const grant = createRevealGrant();
    const activeView = createBackpackView({
      backpack: inventory.backpack,
      viewerPlayerId: VIEWER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 12,
      revealGrants: [grant],
    });
    const unrelatedView = createBackpackView({
      backpack: inventory.backpack,
      viewerPlayerId: OTHER_VIEWER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 12,
      revealGrants: [grant],
    });
    const expiredView = createBackpackView({
      backpack: inventory.backpack,
      viewerPlayerId: VIEWER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 13,
      revealGrants: [grant],
    });

    expect(activeView.visibility).toBe("full");
    expect(activeView.visibility === "full" ? activeView.revealGrantId : null).toBe(
      "reveal.scouting-glass",
    );
    expect(unrelatedView.visibility).toBe("masked");
    expect(expiredView.visibility).toBe("masked");
  });

  it("always exposes equipped items while keeping another player's backpack masked", () => {
    const inventory = createInventory();
    const weapon = createEquipmentInstance({
      instanceId: "equipment-instance.public-sword",
      definitionId: "equipment.public-sword",
      ownerPlayerId: OWNER_ID,
    });
    const emptyLoadout = createEmptyEquipmentLoadout(OWNER_ID);
    const equipmentLoadout = {
      ...emptyLoadout,
      slots: { ...emptyLoadout.slots, weapon },
    };
    const view = createPlayerItemView({
      inventory,
      equipmentLoadout,
      viewerPlayerId: VIEWER_ID,
      itemDefinitions: ITEM_DEFINITIONS,
      currentSequence: 10,
    });

    expect(view.backpack.visibility).toBe("masked");
    expect(view.equipment.visibility).toBe("public");
    expect(view.equipment.slots.find(({ slot }) => slot === "weapon")?.equipment).toEqual(weapon);
  });

  it("rejects invalid reveal windows and mismatched equipment ownership", () => {
    const inventory = createInventory();

    expect(() =>
      createBackpackView({
        backpack: inventory.backpack,
        viewerPlayerId: VIEWER_ID,
        itemDefinitions: ITEM_DEFINITIONS,
        currentSequence: 10,
        revealGrants: [{ ...createRevealGrant(), validFromSequence: 13 }],
      }),
    ).toThrow("cannot expire before it starts");

    expect(() =>
      createPlayerItemView({
        inventory,
        equipmentLoadout: createEmptyEquipmentLoadout(VIEWER_ID),
        viewerPlayerId: VIEWER_ID,
        itemDefinitions: ITEM_DEFINITIONS,
        currentSequence: 10,
      }),
    ).toThrow("same player");
  });
});

/**
 * 方法名：createInventory
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createInventory() {
  const inventory = createPlayerInventory(OWNER_ID);
  const item = createItemInstance(
    {
      instanceId: "item-instance.secret-potion",
      definitionId: POTION_DEFINITION_ID,
      ownerPlayerId: OWNER_ID,
      quantity: 2,
    },
    ITEM_DEFINITIONS[POTION_DEFINITION_ID],
  );

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, item, { x: 1, y: 2 }, ITEM_DEFINITIONS),
  };
}

/**
 * 方法名：createRevealGrant
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createRevealGrant(): BackpackRevealGrant {
  return {
    grantId: "reveal.scouting-glass",
    sourceId: "item.scouting-glass",
    ownerPlayerId: OWNER_ID,
    viewerPlayerId: VIEWER_ID,
    validFromSequence: 10,
    validUntilSequence: 12,
  };
}
