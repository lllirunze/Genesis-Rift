import { describe, expect, it } from "vitest";

import { validateConsumableUsageCatalog } from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import { ITEM_DEFINITION_CATALOG } from "./item-definitions.ts";
import {
  ANTIDOTE_USAGE_DEFINITION,
  CONSUMABLE_USAGE_CATALOG,
  HEALING_POTION_USAGE_DEFINITION,
  WIND_TONIC_USAGE_DEFINITION,
} from "./consumable-usage-definitions.ts";

describe("consumable usage definitions", () => {
  it("keeps usage effects separate from backpack item definitions", () => {
    expect(HEALING_POTION_USAGE_DEFINITION.effects[0]).toEqual({
      effectId: "resource.restore",
      parameters: { resourceId: "health", amount: 25 },
    });
    expect(WIND_TONIC_USAGE_DEFINITION.effects[0]?.effectId).toBe("status.add");
    expect(ANTIDOTE_USAGE_DEFINITION.effects[0]?.effectId).toBe("status.remove");
    expect(
      "effects" in ITEM_DEFINITION_CATALOG[HEALING_POTION_USAGE_DEFINITION.itemDefinitionId]!,
    ).toBe(false);
  });

  it("provides valid usage configuration for configured consumable items", () => {
    expect(() => validateConsumableUsageCatalog(CONSUMABLE_USAGE_CATALOG)).not.toThrow();
    const itemCatalog: ItemDefinitionCatalog = ITEM_DEFINITION_CATALOG;

    for (const itemDefinitionId of Object.keys(CONSUMABLE_USAGE_CATALOG)) {
      expect(itemCatalog[itemDefinitionId]?.category).toBe("consumable");
    }
  });
});
