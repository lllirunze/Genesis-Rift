/** 描述攻击合法性检查可能产生的稳定失败原因。 */
export const ATTACK_INELIGIBILITY_REASONS = [
  "NO_ACTION_PERMISSION",
  "ATTACKER_CANNOT_ATTACK",
  "INVALID_TARGET",
  "TARGET_NOT_VISIBLE",
  "OUT_OF_RANGE",
  "INSUFFICIENT_RESOURCE",
  "MAP_RESTRICTED",
] as const;

/** 描述当前模块对外公开的攻击不合法原因。 */
export type AttackIneligibilityReason = (typeof ATTACK_INELIGIBILITY_REASONS)[number];

/** 描述由地图、角色、装备与回合系统提供的攻击资格事实。 */
export interface AttackEligibilityInput {
  readonly hasActionPermission: boolean;
  readonly attackerCanAttack: boolean;
  readonly targetIsAttackable: boolean;
  readonly targetIsVisible: boolean;
  readonly targetIsInRange: boolean;
  readonly resourcesAreSufficient: boolean;
  readonly mapAllowsAttack: boolean;
}

/** 描述攻击资格检查的确定性结果。 */
export type AttackEligibilityResult =
  | {
      readonly allowed: true;
      readonly reason: null;
    }
  | {
      readonly allowed: false;
      readonly reason: AttackIneligibilityReason;
    };

/**
 * 方法名：evaluateAttackEligibility
 * 作用：按照固定顺序检查攻击是否能够正式发起，不修改任一外部业务状态。
 * @param input 来自回合、角色、地图、装备与资源系统的攻击资格事实。
 * @returns 允许攻击或首个稳定失败原因。
 * @throws 任一资格事实不是布尔值时抛出错误。
 */
export function evaluateAttackEligibility(input: AttackEligibilityInput): AttackEligibilityResult {
  validateAttackEligibilityInput(input);

  if (!input.hasActionPermission) {
    return { allowed: false, reason: "NO_ACTION_PERMISSION" };
  }

  if (!input.attackerCanAttack) {
    return { allowed: false, reason: "ATTACKER_CANNOT_ATTACK" };
  }

  if (!input.targetIsAttackable) {
    return { allowed: false, reason: "INVALID_TARGET" };
  }

  if (!input.targetIsVisible) {
    return { allowed: false, reason: "TARGET_NOT_VISIBLE" };
  }

  if (!input.targetIsInRange) {
    return { allowed: false, reason: "OUT_OF_RANGE" };
  }

  if (!input.resourcesAreSufficient) {
    return { allowed: false, reason: "INSUFFICIENT_RESOURCE" };
  }

  if (!input.mapAllowsAttack) {
    return { allowed: false, reason: "MAP_RESTRICTED" };
  }

  return { allowed: true, reason: null };
}

/**
 * 方法名：validateAttackEligibilityInput
 * 作用：校验攻击资格检查使用的全部外部事实均为明确布尔值。
 * @param input 需要校验的攻击资格事实。
 * @returns 无返回值。
 * @throws 任一资格事实不是布尔值时抛出错误。
 */
export function validateAttackEligibilityInput(input: AttackEligibilityInput): void {
  for (const [field, value] of Object.entries(input)) {
    if (typeof value !== "boolean") {
      throw new TypeError(`${field} must be a boolean`);
    }
  }
}
