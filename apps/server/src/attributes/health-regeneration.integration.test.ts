import { describe, expect, it } from "vitest";

import { calculateDerivedAttribute } from "@genesis-rift/game-core";
import { HEALTH_REGENERATION_FORMULA_CONFIG } from "@genesis-rift/game-data";

const BASELINE_PRIMARY_ATTRIBUTES = {
  strength: 5,
  constitution: 5,
  spirit: 5,
  agility: 5,
  insight: 5,
} as const;

describe("health regeneration formula", () => {
  it("keeps baseline health regeneration low and returns an integer", () => {
    const healthRegeneration = calculateDerivedAttribute({
      currentPrimaryAttributes: BASELINE_PRIMARY_ATTRIBUTES,
      config: HEALTH_REGENERATION_FORMULA_CONFIG,
    });

    expect(healthRegeneration).toBe(2);
    expect(Number.isInteger(healthRegeneration)).toBe(true);
  });

  it("rounds once after all floating-point contributions are combined", () => {
    const healthRegeneration = calculateDerivedAttribute({
      currentPrimaryAttributes: {
        ...BASELINE_PRIMARY_ATTRIBUTES,
        constitution: 7,
        insight: 6,
      },
      config: HEALTH_REGENERATION_FORMULA_CONFIG,
    });

    // floor(7 x 0.25 + 6 x 0.15) = floor(2.65) = 2
    expect(healthRegeneration).toBe(2);
  });

  it("supports runtime primary and derived offsets through the shared formula", () => {
    const healthRegeneration = calculateDerivedAttribute({
      currentPrimaryAttributes: BASELINE_PRIMARY_ATTRIBUTES,
      config: HEALTH_REGENERATION_FORMULA_CONFIG,
      primaryDynamicOffset: {
        constitution: 3,
        insight: 2,
      },
      derivedDynamicOffset: 1,
    });

    // floor(8 x 0.25 + 7 x 0.15 + 1) = floor(4.05) = 4
    expect(healthRegeneration).toBe(4);
  });
});
