import { describe, expect, it } from "vitest";

import {
  createPlayerInventory,
  receiveItem,
  validateItemDefinitionCatalog,
} from "@genesis-rift/game-core";
import { ITEM_DEFINITION_CATALOG } from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

const PLAYER_ID = "player-1" as PlayerId;

describe("item definition catalog integration", () => {
  it("loads every configured item through the shared item contract", () => {
    expect(() => validateItemDefinitionCatalog(ITEM_DEFINITION_CATALOG)).not.toThrow();
  });

  it("allows every initial example item to enter a level-one backpack", () => {
    for (const definition of Object.values(ITEM_DEFINITION_CATALOG)) {
      const result = receiveItem(
        createPlayerInventory(PLAYER_ID),
        {
          definitionId: definition.definitionId,
          quantity: 1,
          sourceId: "test.initial-item",
          newItemInstanceIds: [`instance.${definition.definitionId}`],
        },
        ITEM_DEFINITION_CATALOG,
      );

      expect(result.backpackQuantityAdded).toBe(1);
      expect(result.inventory.temporaryPickup).toBeNull();
      expect(result.unresolvedItems).toEqual([]);
    }
  });
});
