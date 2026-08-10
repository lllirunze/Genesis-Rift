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

/** 物理攻击公式：力量为主、敏捷为辅，服务于普通攻击与物理技能。 */
export const PHYSICAL_ATTACK_FORMULA_CONFIG = {
  coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 2, agility: 1 },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: null,
} as const satisfies DerivedAttributeFormulaConfig;

/** 物理防御公式：体质与力量共同提供有限的固定伤害抵御能力。 */
export const PHYSICAL_DEFENSE_FORMULA_CONFIG = {
  coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 1, constitution: 1 },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: null,
} as const satisfies DerivedAttributeFormulaConfig;

/** 闪避率公式：敏捷为主、体质为辅，使用百分数整数并限制在 80。 */
export const EVASION_RATE_FORMULA_CONFIG = {
  coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, constitution: 1, agility: 2 },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: 80,
} as const satisfies DerivedAttributeFormulaConfig;

/** 暴击率公式：敏捷与悟性共同决定，使用百分数整数并限制在 80。 */
export const CRITICAL_RATE_FORMULA_CONFIG = {
  coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, agility: 1, insight: 1 },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 0,
  roundingMode: "floor",
  minimum: 0,
  maximum: 80,
} as const satisfies DerivedAttributeFormulaConfig;

/** 暴击伤害公式：力量与灵力提供加成，底值为 100%。 */
export const CRITICAL_DAMAGE_FORMULA_CONFIG = {
  coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, strength: 1, spirit: 1 },
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
  derivedStaticOffset: 100,
  roundingMode: "floor",
  minimum: 100,
  maximum: 200,
} as const satisfies DerivedAttributeFormulaConfig;

/** 护甲穿透暂不由基础属性成长，仅由装备、状态和特殊效果提供。 */
export const ARMOR_PENETRATION_FORMULA_CONFIG = {
  coefficients: ZERO_PRIMARY_ATTRIBUTES,
  primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
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
  physicalAttack: PHYSICAL_ATTACK_FORMULA_CONFIG,
  physicalDefense: PHYSICAL_DEFENSE_FORMULA_CONFIG,
  evasionRate: EVASION_RATE_FORMULA_CONFIG,
  criticalRate: CRITICAL_RATE_FORMULA_CONFIG,
  criticalDamage: CRITICAL_DAMAGE_FORMULA_CONFIG,
  armorPenetration: ARMOR_PENETRATION_FORMULA_CONFIG,
} as const satisfies Record<string, DerivedAttributeFormulaConfig>;
