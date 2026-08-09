/** V1阶段支持的三种基础伤害类型。 */
export const DAMAGE_TYPES = ["PHYSICAL", "MAGICAL", "TRUE"] as const;

/** 攻击未被闪避且攻击值大于零时使用的最低普通伤害。 */
export const MINIMUM_SUCCESSFUL_ATTACK_DAMAGE = 1;

/** 暴击伤害使用的整数百分数基准，100表示100%。 */
export const CRITICAL_DAMAGE_PERCENT_SCALE = 100;

/** 暴击伤害允许使用的最低整数百分数。 */
export const MINIMUM_CRITICAL_DAMAGE_PERCENT = 100;
