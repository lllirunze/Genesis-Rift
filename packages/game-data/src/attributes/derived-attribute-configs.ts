import type { DerivedAttributeFormulaConfig, PrimaryAttributes } from "@genesis-rift/shared";

/** 未参与某项派生公式的基础属性所使用的零值模板。 */
const ZERO_PRIMARY_ATTRIBUTES: PrimaryAttributes = {
  strength: 0,
  constitution: 0,
  spirit: 0,
  agility: 0,
  insight: 0,
};

/** 最大生命值公式：体质乘以 8 后加 50。 */
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

/** 生命恢复公式：体质乘以 0.25 与悟性乘以 0.15 之和向下取整。 */
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

/** 移动力公式：带静态偏移的体质与敏捷按各自系数计算后向下取整。 */
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

/** 当前已投入使用的派生属性公式注册表。 */
export const DERIVED_ATTRIBUTE_FORMULA_CONFIGS = {
  maxHealth: MAX_HEALTH_FORMULA_CONFIG,
  healthRegeneration: HEALTH_REGENERATION_FORMULA_CONFIG,
  movementRange: MOVEMENT_RANGE_FORMULA_CONFIG,
} as const satisfies Record<string, DerivedAttributeFormulaConfig>;
