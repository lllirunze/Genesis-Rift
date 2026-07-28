import { describe, expect, it } from "vitest";

import { calculateDerivedAttribute } from "@genesis-rift/game-core";
import { MAX_HEALTH_FORMULA_CONFIG } from "@genesis-rift/game-data";

describe("maximum health formula", () => {
  it("calculates 90 maximum health for the baseline constitution of 5", () => {
    const maximumHealth = calculateDerivedAttribute({
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      config: MAX_HEALTH_FORMULA_CONFIG,
    });

    expect(maximumHealth).toBe(90);
  });

  it("applies runtime constitution and maximum health offsets through the same formula", () => {
    const maximumHealth = calculateDerivedAttribute({
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      config: MAX_HEALTH_FORMULA_CONFIG,
      primaryDynamicOffset: { constitution: 2 },
      derivedDynamicOffset: 10,
    });

    expect(maximumHealth).toBe(116);
  });
});
