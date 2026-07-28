import { describe, expect, it } from "vitest";

import { aggregateAttributeModifiers } from "./aggregate-attribute-modifiers.ts";
import type { AttributeModifier } from "./attribute-modifier.ts";

const MODIFIERS: readonly AttributeModifier[] = [
  {
    modifierId: "equipment.bracer.strength",
    sourceId: "equipment.bracer",
    sourceType: "equipment",
    targetType: "primary",
    targetAttribute: "strength",
    value: 2,
  },
  {
    modifierId: "status.weakness.strength",
    sourceId: "status.weakness",
    sourceType: "status",
    targetType: "primary",
    targetAttribute: "strength",
    value: -1,
  },
  {
    modifierId: "equipment.boots.movementRange",
    sourceId: "equipment.boots",
    sourceType: "equipment",
    targetType: "derived",
    targetAttribute: "movementRange",
    value: 2,
  },
  {
    modifierId: "weather.storm.movementRange",
    sourceId: "weather.storm",
    sourceType: "weather",
    targetType: "derived",
    targetAttribute: "movementRange",
    value: -1,
  },
];

describe("aggregateAttributeModifiers", () => {
  it("sums primary and derived modifiers independently", () => {
    expect(aggregateAttributeModifiers(MODIFIERS)).toEqual({
      primaryDynamicOffset: {
        strength: 1,
        constitution: 0,
        spirit: 0,
        agility: 0,
        insight: 0,
      },
      derivedDynamicOffset: {
        movementRange: 1,
      },
    });
  });

  it("rejects duplicate modifier ids", () => {
    expect(() => aggregateAttributeModifiers([MODIFIERS[0]!, MODIFIERS[0]!])).toThrow(
      "Duplicate attribute modifier id",
    );
  });

  it("rejects non-finite modifier values", () => {
    expect(() =>
      aggregateAttributeModifiers([
        {
          modifierId: "invalid",
          sourceId: "test",
          sourceType: "test",
          targetType: "derived",
          targetAttribute: "movementRange",
          value: Number.NaN,
        },
      ]),
    ).toThrow(TypeError);
  });
});
