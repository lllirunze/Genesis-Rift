import type { AttackEligibilityResult } from "./attack-eligibility.ts";

/** 描述一次攻击需要消耗的单项通用资源。 */
export interface AttackResourceCost {
  readonly resourceId: string;
  readonly amount: number;
}

/** 描述攻击正式发起前由上层维护的行动与资源快照。 */
export interface AttackInitiationState {
  readonly primaryActionAvailable: boolean;
  readonly remainingMovementPoints: number;
  readonly resources: Readonly<Record<string, number>>;
}

/** 描述攻击发起成功后的更新状态与已支付成本。 */
export interface CommitAttackInitiationResult {
  readonly state: AttackInitiationState;
  readonly actionConsumed: boolean;
  readonly movementPointsConsumed: number;
  readonly resourceCosts: readonly AttackResourceCost[];
}

/**
 * 方法名：commitAttackInitiation
 * 作用：在攻击资格已确认后消耗主要行动、清空剩余移动力并扣除指定资源。
 * @param state 攻击发起前的行动与资源快照。
 * @param eligibility 已完成的攻击合法性检查结果。
 * @param resourceCosts 本次攻击需要支付的资源成本。
 * @returns 更新后的攻击发起状态及结构化成本摘要。
 * @throws 攻击不合法、行动不可用、资源不足或成本配置非法时抛出错误。
 */
export function commitAttackInitiation(
  state: AttackInitiationState,
  eligibility: AttackEligibilityResult,
  resourceCosts: readonly AttackResourceCost[],
): CommitAttackInitiationResult {
  validateAttackInitiationState(state);
  validateAttackResourceCosts(resourceCosts);

  if (!eligibility.allowed) {
    throw new Error(`Cannot initiate ineligible attack: ${eligibility.reason}`);
  }

  if (!state.primaryActionAvailable) {
    throw new Error("Cannot initiate attack without a primary action");
  }

  const nextResources = { ...state.resources };

  for (const cost of resourceCosts) {
    const current = nextResources[cost.resourceId];

    if (current === undefined) {
      throw new Error(`Missing attack resource: ${cost.resourceId}`);
    }

    if (current < cost.amount) {
      throw new RangeError(
        `Insufficient attack resource ${cost.resourceId}: required ${cost.amount}, available ${current}`,
      );
    }

    nextResources[cost.resourceId] = current - cost.amount;
  }

  return Object.freeze({
    state: Object.freeze({
      primaryActionAvailable: false,
      remainingMovementPoints: 0,
      resources: Object.freeze(nextResources),
    }),
    actionConsumed: true,
    movementPointsConsumed: state.remainingMovementPoints,
    resourceCosts: Object.freeze(resourceCosts.map((cost) => Object.freeze({ ...cost }))),
  });
}

/**
 * 方法名：validateAttackInitiationState
 * 作用：校验攻击发起使用的行动与资源快照。
 * @param state 需要校验的攻击发起状态。
 * @returns 无返回值。
 * @throws 行动、移动力或资源数量不满足安全整数约束时抛出错误。
 */
export function validateAttackInitiationState(state: AttackInitiationState): void {
  if (typeof state.primaryActionAvailable !== "boolean") {
    throw new TypeError("primaryActionAvailable must be a boolean");
  }

  assertNonNegativeSafeInteger(state.remainingMovementPoints, "remainingMovementPoints");

  for (const [resourceId, amount] of Object.entries(state.resources)) {
    assertNonEmptyString(resourceId, "resources.resourceId");
    assertNonNegativeSafeInteger(amount, `resources.${resourceId}`);
  }
}

/**
 * 方法名：validateAttackResourceCosts
 * 作用：校验攻击成本不包含重复资源、空标识或非法数量。
 * @param resourceCosts 需要校验的资源成本集合。
 * @returns 无返回值。
 * @throws 成本资源标识重复或数量不是正安全整数时抛出错误。
 */
export function validateAttackResourceCosts(resourceCosts: readonly AttackResourceCost[]): void {
  const resourceIds = new Set<string>();

  for (const cost of resourceCosts) {
    assertNonEmptyString(cost.resourceId, "resourceId");

    if (!Number.isSafeInteger(cost.amount) || cost.amount <= 0) {
      throw new RangeError("attack resource cost amount must be a positive safe integer");
    }

    if (resourceIds.has(cost.resourceId)) {
      throw new Error(`Duplicate attack resource cost: ${cost.resourceId}`);
    }

    resourceIds.add(cost.resourceId);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是大于或等于零的安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是非空字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非空字符串时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
