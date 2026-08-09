/** 攻击来源按照发起攻击的主要业务系统进行分类。 */
export const ATTACK_SOURCE_TYPES = [
  "normal",
  "skill",
  "equipment",
  "handCard",
  "status",
  "event",
] as const;

/** 基础攻击流程在当前阶段可以产生的最终结果。 */
export const ATTACK_RESOLUTION_OUTCOMES = ["CANCELLED", "EVADED", "RESOLVED"] as const;
