import { describe, expect, it } from "vitest";

import { calculateDerivedAttribute } from "@genesis-rift/game-core";
import { MOVEMENT_RANGE_FORMULA_CONFIG } from "@genesis-rift/game-data";

const BASELINE_PRIMARY_ATTRIBUTES = {
  strength: 5,
  constitution: 5,
  spirit: 5,
  agility: 5,
  insight: 5,
} as const;

describe("movement range formula", () => {
  it("calculates the documented baseline movement range of three", () => {
    const movementRange = calculateDerivedAttribute({
      currentPrimaryAttributes: BASELINE_PRIMARY_ATTRIBUTES,
      config: MOVEMENT_RANGE_FORMULA_CONFIG,
    });

    expect(movementRange).toBe(3);
    expect(Number.isInteger(movementRange)).toBe(true);
  });

  it("adds runtime derived offsets after the primary attribute conversion", () => {
    const movementRange = calculateDerivedAttribute({
      currentPrimaryAttributes: BASELINE_PRIMARY_ATTRIBUTES,
      config: MOVEMENT_RANGE_FORMULA_CONFIG,
      derivedDynamicOffset: 2,
    });

    expect(movementRange).toBe(5);
  });

  it("never returns less than zero after negative runtime offsets", () => {
    const movementRange = calculateDerivedAttribute({
      currentPrimaryAttributes: BASELINE_PRIMARY_ATTRIBUTES,
      config: MOVEMENT_RANGE_FORMULA_CONFIG,
      derivedDynamicOffset: -10,
    });

    expect(movementRange).toBe(0);
  });
});
