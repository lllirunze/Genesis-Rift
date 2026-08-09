/** 技能可在当前版本采用的基础触发方式。 */
export const SKILL_TYPES = ["active", "passive", "triggered"] as const;

/** 技能配置可以声明的目标范围类型。 */
export const SKILL_TARGET_TYPES = ["self", "single_target", "area"] as const;

/** 技能效果执行器当前支持注册的基础效果分类。 */
export const SKILL_EFFECT_TYPES = [
  "attack",
  "status_add",
  "resource_restore",
  "shield_grant",
  "forced_displacement",
] as const;
