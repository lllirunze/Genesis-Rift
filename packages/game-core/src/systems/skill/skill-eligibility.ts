import type { SkillDefinition } from "./skill-definition.ts";
import { getSkillRuntimeEntry, type CharacterSkillState } from "./skill-runtime-state.ts";

/** 描述主动技能无法使用时返回的稳定原因。 */
export const SKILL_INELIGIBILITY_REASONS = [
  "NOT_ACTIVE",
  "ON_COOLDOWN",
  "USAGE_LIMIT_REACHED",
  "CONDITION_UNMET",
  "INVALID_TARGET",
  "OUT_OF_RANGE",
  "INSUFFICIENT_RESOURCE",
] as const;

/** 描述技能资格检查可能返回的失败原因。 */
export type SkillIneligibilityReason = (typeof SKILL_INELIGIBILITY_REASONS)[number];

/** 描述由回合、地图、目标与资源模块提供的技能资格事实。 */
export interface SkillEligibilityInput {
  readonly conditionsSatisfied: boolean;
  readonly targetIsValid: boolean;
  readonly targetIsInRange: boolean;
  readonly resourcesAreSufficient: boolean;
}

/** 描述主动技能是否可以进入资源消耗与效果执行阶段。 */
export type SkillEligibilityResult =
  | { readonly allowed: true; readonly reason: null }
  | { readonly allowed: false; readonly reason: SkillIneligibilityReason };

/**
 * 方法名：evaluateSkillEligibility
 * 作用：按固定顺序检查主动技能的类型、冷却、次数和外部使用条件。
 * @param state 角色当前技能运行时状态。
 * @param definition 准备使用的技能定义。
 * @param input 来自地图、资源与目标系统的资格事实。
 * @returns 允许释放或首个稳定失败原因。
 * @throws 外部资格事实不是布尔值或技能未掌握时抛出错误。
 */
export function evaluateSkillEligibility(
  state: CharacterSkillState,
  definition: SkillDefinition,
  input: SkillEligibilityInput,
): SkillEligibilityResult {
  validateSkillEligibilityInput(input);
  const entry = getSkillRuntimeEntry(state, definition.definitionId);

  if (definition.type !== "active") {
    return { allowed: false, reason: "NOT_ACTIVE" };
  }

  if (entry.remainingCooldownTurns > 0) {
    return { allowed: false, reason: "ON_COOLDOWN" };
  }

  if (entry.usesThisTurn >= definition.maxUsesPerTurn) {
    return { allowed: false, reason: "USAGE_LIMIT_REACHED" };
  }

  if (!input.conditionsSatisfied) {
    return { allowed: false, reason: "CONDITION_UNMET" };
  }

  if (!input.targetIsValid) {
    return { allowed: false, reason: "INVALID_TARGET" };
  }

  if (!input.targetIsInRange) {
    return { allowed: false, reason: "OUT_OF_RANGE" };
  }

  if (!input.resourcesAreSufficient) {
    return { allowed: false, reason: "INSUFFICIENT_RESOURCE" };
  }

  return { allowed: true, reason: null };
}

/**
 * 方法名：validateSkillEligibilityInput
 * 作用：校验所有外部技能资格事实均是明确的布尔值。
 * @param input 需要校验的资格事实。
 * @returns 无返回值。
 * @throws 任一资格字段不是布尔值时抛出错误。
 */
export function validateSkillEligibilityInput(input: SkillEligibilityInput): void {
  for (const [field, value] of Object.entries(input)) {
    if (typeof value !== "boolean") {
      throw new TypeError(`${field} must be a boolean`);
    }
  }
}
