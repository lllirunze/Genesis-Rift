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

/** 被动与触发技能在 V1 可以订阅的统一业务时机。 */
export const SKILL_TRIGGER_EVENT_TYPES = [
  "TURN_START",
  "TURN_END",
  "ATTACK_DECLARED",
  "ATTACK_RESOLVED",
  "DAMAGE_RECEIVED",
  "TARGET_DOWNED",
  "TARGET_DEFEATED",
] as const;

/** 描述被动与触发技能可以订阅的统一业务时机。 */
export type SkillTriggerEventType = (typeof SKILL_TRIGGER_EVENT_TYPES)[number];
