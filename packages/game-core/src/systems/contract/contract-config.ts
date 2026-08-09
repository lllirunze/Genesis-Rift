/** 神鬼契约的强度分类，用于配置筛选与数值平衡。 */
export const CONTRACT_STRENGTHS = ["WEAK", "NORMAL", "STRONG", "EXTREME"] as const;

/** 神鬼契约负面效果的触发方式。 */
export const CONTRACT_DEBUFF_TRIGGER_TYPES = ["PERSONAL_TURN", "WORLD_STAGE"] as const;

/** 契约效果需要由既有业务系统处理的效果分类。 */
export const CONTRACT_EFFECT_TYPES = ["ATTRIBUTE_MODIFIER", "GAMEPLAY_RULE"] as const;

/** 描述神鬼契约的强度分类。 */
export type ContractStrength = (typeof CONTRACT_STRENGTHS)[number];

/** 描述神鬼契约负面效果的触发方式。 */
export type ContractDebuffTriggerType = (typeof CONTRACT_DEBUFF_TRIGGER_TYPES)[number];

/** 描述神鬼契约效果需要接入的既有系统类型。 */
export type ContractEffectType = (typeof CONTRACT_EFFECT_TYPES)[number];
