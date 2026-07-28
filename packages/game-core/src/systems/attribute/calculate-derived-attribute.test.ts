import { describe, expect, it } from "vitest";

import type { DerivedAttributeFormulaConfig, PrimaryAttributes } from "@genesis-rift/shared";

import { calculateDerivedAttribute } from "./calculate-derived-attribute.ts";

const CURRENT_PRIMARY_ATTRIBUTES: PrimaryAttributes = {
  strength: 5,
  constitution: 6,
  spirit: 7,
  agility: 8,
  insight: 9,
};

const ZERO_PRIMARY_ATTRIBUTES: PrimaryAttributes = {
  strength: 0,
  constitution: 0,
  spirit: 0,
  agility: 0,
  insight: 0,
};

function createConfig(
  overrides: Partial<DerivedAttributeFormulaConfig> = {},
): DerivedAttributeFormulaConfig {
  return {
    coefficients: ZERO_PRIMARY_ATTRIBUTES,
    primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
    derivedStaticOffset: 0,
    roundingMode: "floor",
    minimum: 0,
    maximum: null,
    ...overrides,
  };
}

describe("calculateDerivedAttribute", () => {
  it("applies primary offsets before coefficients and derived offsets afterward", () => {
    const value = calculateDerivedAttribute({
      currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
      config: createConfig({
        coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 2, spirit: 3 },
        primaryStaticOffset: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 1 },
        derivedStaticOffset: 10,
      }),
      primaryDynamicOffset: { strength: 2, spirit: -1 },
      derivedDynamicOffset: 4,
    });

    expect(value).toBe(48);
  });

  it("allows a derived attribute with no primary attribute contribution", () => {
    const value = calculateDerivedAttribute({
      currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
      config: createConfig({ derivedStaticOffset: 2 }),
      derivedDynamicOffset: 5,
    });

    expect(value).toBe(7);
  });

  it("rounds once after the complete formula", () => {
    const value = calculateDerivedAttribute({
      currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
      config: createConfig({
        coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 0.5, constitution: 0.5 },
        derivedStaticOffset: 0.8,
      }),
    });

    expect(value).toBe(6);
  });

  it("ignores machine precision noise at integer boundaries", () => {
    const value = calculateDerivedAttribute({
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      config: createConfig({
        coefficients: {
          ...ZERO_PRIMARY_ATTRIBUTES,
          constitution: 0.15,
          agility: 0.35,
        },
        primaryStaticOffset: {
          ...ZERO_PRIMARY_ATTRIBUTES,
          constitution: 1,
          agility: 1,
        },
      }),
    });

    expect(value).toBe(3);
  });

  it("supports explicit ceiling and applies minimum then maximum boundaries", () => {
    const value = calculateDerivedAttribute({
      currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
      config: createConfig({
        derivedStaticOffset: 12.1,
        roundingMode: "ceil",
        minimum: 5,
        maximum: 10,
      }),
    });

    expect(value).toBe(10);
  });

  it("rejects invalid boundaries and non-finite inputs", () => {
    expect(() =>
      calculateDerivedAttribute({
        currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
        config: createConfig({ minimum: 10, maximum: 5 }),
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateDerivedAttribute({
        currentPrimaryAttributes: CURRENT_PRIMARY_ATTRIBUTES,
        config: createConfig(),
        derivedDynamicOffset: Number.NaN,
      }),
    ).toThrow(TypeError);
  });
});
