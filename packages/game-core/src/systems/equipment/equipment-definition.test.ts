import { describe, expect, it } from "vitest";

import {
  validateEquipmentDefinition,
  validateEquipmentDefinitions,
  type EquipmentDefinition,
} from "./equipment-definition.ts";

const DEFINITION: EquipmentDefinition = {
  definitionId: "equip_000003",
  name: "Wind Boots",
  type: "shoes",
  quality: "rare",
  corePosition: "Improves movement without changing the movement formula.",
  allowDuplicateEquipping: false,
  attributeEffects: [
    {
      effectId: "agility",
      targetType: "primary",
      targetAttribute: "agility",
      value: 1,
    },
    {
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      value: 2,
    },
  ],
};

describe("equipment definition validation", () => {
  it("accepts a complete equipment definition", () => {
    expect(() => validateEquipmentDefinition(DEFINITION)).not.toThrow();
  });

  it("rejects duplicate effect ids and fractional attribute effects", () => {
    expect(() =>
      validateEquipmentDefinition({
        ...DEFINITION,
        attributeEffects: [DEFINITION.attributeEffects[0]!, DEFINITION.attributeEffects[0]!],
      }),
    ).toThrow("Duplicate equipment effect id");

    expect(() =>
      validateEquipmentDefinition({
        ...DEFINITION,
        attributeEffects: [{ ...DEFINITION.attributeEffects[0]!, value: 0.5 }],
      }),
    ).toThrow(TypeError);
  });

  it("requires globally unique definition ids and names", () => {
    expect(() =>
      validateEquipmentDefinitions([DEFINITION, { ...DEFINITION, definitionId: "equip_000104" }]),
    ).toThrow("Duplicate equipment name");
  });
});
