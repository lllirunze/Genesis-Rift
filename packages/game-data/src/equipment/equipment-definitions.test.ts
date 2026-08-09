import { describe, expect, it } from "vitest";
import { validateEquipmentDefinitions } from "@genesis-rift/game-core";
import { EQUIPMENT_DEFINITION_CATALOG } from "./equipment-definitions.ts";
describe("equipment definitions", () => {
  it("contains valid V1 equipment", () => {
    expect(() =>
      validateEquipmentDefinitions(Object.values(EQUIPMENT_DEFINITION_CATALOG)),
    ).not.toThrow();
  });
});
