import { describe, expect, it } from "vitest";

import {
  DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
  HEALTH_REGENERATION_FORMULA_CONFIG,
  MAX_HEALTH_FORMULA_CONFIG,
  MOVEMENT_RANGE_FORMULA_CONFIG,
} from "./derived-attribute-configs.ts";

describe("derived attribute formula configs", () => {
  it("defines maximum health as constitution x 8 plus 50", () => {
    expect(MAX_HEALTH_FORMULA_CONFIG).toEqual({
      coefficients: {
        strength: 0,
        constitution: 8,
        spirit: 0,
        agility: 0,
        insight: 0,
      },
      primaryStaticOffset: {
        strength: 0,
        constitution: 0,
        spirit: 0,
        agility: 0,
        insight: 0,
      },
      derivedStaticOffset: 50,
      roundingMode: "floor",
      minimum: 1,
      maximum: null,
    });
  });

  it("registers maximum health in the shared formula catalog", () => {
    expect(DERIVED_ATTRIBUTE_FORMULA_CONFIGS.maxHealth).toBe(MAX_HEALTH_FORMULA_CONFIG);
  });

  it("defines low-growth health regeneration from constitution and insight", () => {
    expect(HEALTH_REGENERATION_FORMULA_CONFIG).toEqual({
      coefficients: {
        strength: 0,
        constitution: 0.25,
        spirit: 0,
        agility: 0,
        insight: 0.15,
      },
      primaryStaticOffset: {
        strength: 0,
        constitution: 0,
        spirit: 0,
        agility: 0,
        insight: 0,
      },
      derivedStaticOffset: 0,
      roundingMode: "floor",
      minimum: 0,
      maximum: null,
    });
  });

  it("registers health regeneration in the shared formula catalog", () => {
    expect(DERIVED_ATTRIBUTE_FORMULA_CONFIGS.healthRegeneration).toBe(
      HEALTH_REGENERATION_FORMULA_CONFIG,
    );
  });

  it("defines movement range with static constitution and agility offsets", () => {
    expect(MOVEMENT_RANGE_FORMULA_CONFIG).toEqual({
      coefficients: {
        strength: 0,
        constitution: 0.15,
        spirit: 0,
        agility: 0.35,
        insight: 0,
      },
      primaryStaticOffset: {
        strength: 0,
        constitution: 1,
        spirit: 0,
        agility: 1,
        insight: 0,
      },
      derivedStaticOffset: 0,
      roundingMode: "floor",
      minimum: 0,
      maximum: null,
    });
  });

  it("registers movement range in the shared formula catalog", () => {
    expect(DERIVED_ATTRIBUTE_FORMULA_CONFIGS.movementRange).toBe(MOVEMENT_RANGE_FORMULA_CONFIG);
  });
});
