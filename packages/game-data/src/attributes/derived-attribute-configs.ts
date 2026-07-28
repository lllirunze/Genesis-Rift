import type { DerivedAttributeFormulaConfig, PrimaryAttributes } from "@genesis-rift/shared";

const ZERO_PRIMARY_ATTRIBUTES: PrimaryAttributes = {
  strength: 0,
  constitution: 0,
  spirit: 0,
  agility: 0,
  insight: 0,
};

/** Maximum health = constitution x 8 + 50. */
export const MAX_HEALTH_FORMULA_CONFIG = {
  coefficients: {
    ...ZERO_PRIMARY_ATTRIBUTES,
    constitution: 8,
  },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 50,
  roundingMode: "floor",
  minimum: 1,
  maximum: null,
} as const satisfies DerivedAttributeFormulaConfig;

/** Health regeneration = floor(constitution x 0.25 + insight x 0.15). */
export const HEALTH_REGENERATION_FORMULA_CONFIG = {
  coefficients: {
    ...ZERO_PRIMARY_ATTRIBUTES,
    constitution: 0.25,
    insight: 0.15,
  },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: null,
} as const satisfies DerivedAttributeFormulaConfig;

/** Movement range = floor((constitution + 1) x 0.15 + (agility + 1) x 0.35). */
export const MOVEMENT_RANGE_FORMULA_CONFIG = {
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
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: null,
} as const satisfies DerivedAttributeFormulaConfig;

export const DERIVED_ATTRIBUTE_FORMULA_CONFIGS = {
  maxHealth: MAX_HEALTH_FORMULA_CONFIG,
  healthRegeneration: HEALTH_REGENERATION_FORMULA_CONFIG,
  movementRange: MOVEMENT_RANGE_FORMULA_CONFIG,
} as const satisfies Record<string, DerivedAttributeFormulaConfig>;
