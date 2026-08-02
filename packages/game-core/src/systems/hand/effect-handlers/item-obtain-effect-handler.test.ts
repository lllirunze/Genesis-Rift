import type { GameId, ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import {
  createItemInstance,
  createPlayerInventory,
  placeItemInBackpack,
} from "../../inventory/index.ts";
import { createHandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import { createItemObtainEffectHandler } from "./item-obtain-effect-handler.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const DEFINITIONS = {
  "item.herb": {
    definitionId: "item.herb",
    name: "Herb",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  "item.blocker": {
    definitionId: "item.blocker",
    name: "Blocker",
    category: "special",
    quality: "common",
    width: 4,
    height: 6,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;
const EFFECT = {
  effectId: "item.obtain",
  parameters: { itemDefinitionId: "item.herb", quantity: 7 },
} as const;

function createContext() {
  return createHandCardEffectExecutionContext({
    executionId: "execution-item-1",
    gameId: GAME_ID,
    cardId: 1,
    effectIndex: 0,
    sourcePlayerId: PLAYER_ID,
    timing: "active",
    targets: [{ type: "player", targetId: PLAYER_ID }],
  });
}

function createInstanceIds(quantity: number): readonly string[] {
  return Array.from({ length: quantity }, (_, index) => `item-instance.hand-card-${index}`);
}

describe("item obtain hand card effect handler", () => {
  it("places obtained items into the target player's backpack", () => {
    const saveInventory = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createItemObtainEffectHandler({
        definitions: DEFINITIONS,
        getPlayerInventoryState: () => createPlayerInventory(PLAYER_ID),
        savePlayerInventoryState: saveInventory,
        createItemInstanceIds: ({ quantity }) => createInstanceIds(quantity),
      }),
    );

    const result = registry.execute(EFFECT, createContext());

    expect(result).toMatchObject({
      effectId: "item.obtain",
      outcome: "applied",
      output: {
        targets: [
          {
            targetPlayerId: PLAYER_ID,
            backpackQuantityAdded: 7,
            temporaryQuantityAdded: 0,
            unresolvedItems: [],
            inventory: {
              backpack: {
                entries: [
                  { item: { definitionId: "item.herb", quantity: 5 } },
                  { item: { definitionId: "item.herb", quantity: 2 } },
                ],
              },
            },
          },
        ],
      },
    });
    expect(saveInventory).toHaveBeenCalledTimes(1);
  });

  it("uses the temporary pickup and reports remaining items when the backpack is full", () => {
    const blocker = createItemInstance(
      {
        instanceId: "item-instance.blocker",
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
    const saveInventory = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createItemObtainEffectHandler({
        definitions: DEFINITIONS,
        getPlayerInventoryState: () => fullInventory,
        savePlayerInventoryState: saveInventory,
        createItemInstanceIds: ({ quantity }) => createInstanceIds(quantity),
      }),
    );

    const result = registry.execute(EFFECT, createContext());

    expect(result).toMatchObject({
      outcome: "applied",
      output: {
        targets: [
          {
            backpackQuantityAdded: 0,
            temporaryQuantityAdded: 5,
            inventory: {
              temporaryPickup: { item: { definitionId: "item.herb", quantity: 5 } },
            },
            unresolvedItems: [{ item: { definitionId: "item.herb", quantity: 2 } }],
          },
        ],
      },
    });
    expect(saveInventory).toHaveBeenCalledTimes(1);
  });

  it("skips missing player inventory targets", () => {
    const saveInventory = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createItemObtainEffectHandler({
        definitions: DEFINITIONS,
        getPlayerInventoryState: () => null,
        savePlayerInventoryState: saveInventory,
        createItemInstanceIds: ({ quantity }) => createInstanceIds(quantity),
      }),
    );

    expect(registry.execute(EFFECT, createContext())).toEqual({
      effectId: "item.obtain",
      outcome: "skipped",
      output: null,
    });
    expect(saveInventory).not.toHaveBeenCalled();
  });
});
