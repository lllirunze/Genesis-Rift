import { describe, expect, it } from "vitest";

import { validateBlueprintDefinitionCatalog } from "@genesis-rift/game-core";

import { ITEM_DEFINITION_CATALOG } from "../items/item-definitions.ts";
import {
  BLUEPRINT_DEFINITION_CATALOG,
  HEAVY_PLATE_ARMOR_BLUEPRINT_DEFINITION,
  LONG_SWORD_BLUEPRINT_DEFINITION,
  TRAVEL_BOOTS_BLUEPRINT_DEFINITION,
} from "./blueprint-definitions.ts";

describe("blueprint definitions", () => {
  it("uses the unified catalog and valid resource references", () => {
    expect(() =>
      validateBlueprintDefinitionCatalog(BLUEPRINT_DEFINITION_CATALOG, ITEM_DEFINITION_CATALOG),
    ).not.toThrow();
  });

  it("provides representative equipment crafting recipes", () => {
    expect(TRAVEL_BOOTS_BLUEPRINT_DEFINITION).toMatchObject({
      blueprintId: "blueprint_000001",
      productItemDefinitionId: "equip_000003",
      coinCost: 3,
    });
    expect(LONG_SWORD_BLUEPRINT_DEFINITION.materialRequirements).toHaveLength(2);
    expect(HEAVY_PLATE_ARMOR_BLUEPRINT_DEFINITION.materialRequirements).toHaveLength(3);
  });
});
