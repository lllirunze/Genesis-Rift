import {
  PERMANENT_STATUS_DURATION_TURNS,
  validateStatusDefinitions,
} from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import {
  ARCANE_ACCUMULATION_STATUS_DEFINITION,
  BATTLE_FURY_STATUS_DEFINITION,
  EXHAUSTION_STATUS_DEFINITION,
  STATUS_DEFINITION_CATALOG,
  VITALITY_BLESSING_STATUS_DEFINITION,
  WIND_BLESSING_STATUS_DEFINITION,
} from "./status-definitions.ts";

describe("status definitions", () => {
  it("provides valid and uniquely identified status configurations", () => {
    expect(() => validateStatusDefinitions(Object.values(STATUS_DEFINITION_CATALOG))).not.toThrow();
    expect(Object.keys(STATUS_DEFINITION_CATALOG)).toEqual([
      "buff_000001",
      "buff_000002",
      "buff_000003",
      "buff_000004",
      "debuff_000001",
      "debuff_000002",
    ]);
  });

  it("covers primary, derived, and combined attribute effects", () => {
    expect(BATTLE_FURY_STATUS_DEFINITION.effects[0]).toMatchObject({
      targetType: "primary",
      targetAttribute: "strength",
    });
    expect(WIND_BLESSING_STATUS_DEFINITION.effects[0]).toMatchObject({
      targetType: "derived",
      targetAttribute: "movementRange",
    });
    expect(VITALITY_BLESSING_STATUS_DEFINITION.effects.map((effect) => effect.targetType)).toEqual([
      "primary",
      "derived",
    ]);
  });

  it("provides a stackable long-lived growth status", () => {
    expect(ARCANE_ACCUMULATION_STATUS_DEFINITION).toMatchObject({
      kind: "buff",
      duration: { turns: PERMANENT_STATUS_DURATION_TURNS },
      maxStacks: 10,
      removal: {
        dispellable: false,
        removeOnDeath: false,
      },
    });
  });

  it("provides a negative status using the same unified model", () => {
    expect(EXHAUSTION_STATUS_DEFINITION.kind).toBe("debuff");
    expect(EXHAUSTION_STATUS_DEFINITION.effects.every((effect) => effect.valuePerStack < 0)).toBe(
      true,
    );
  });
});
