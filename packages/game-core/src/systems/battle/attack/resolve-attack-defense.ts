import type { AttackDefenseResolution } from "./attack-definition.ts";

/** 描述主动防御响应支持的基础效果类型。 */
export const ATTACK_DEFENSE_RESPONSE_TYPES = [
  "CANCEL",
  "MODIFY_EVASION",
  "MODIFY_ATTACK_VALUE",
  "GRANT_SHIELD",
] as const;

/** 描述当前模块对外公开的主动防御响应类型。 */
export type AttackDefenseResponseType = (typeof ATTACK_DEFENSE_RESPONSE_TYPES)[number];

/** 描述已通过手牌、技能、装备或状态系统校验的一项主动防御响应。 */
export type AttackDefenseResponse =
  | {
      readonly responseId: string;
      readonly type: "CANCEL";
    }
  | {
      readonly responseId: string;
      readonly type: "MODIFY_EVASION" | "MODIFY_ATTACK_VALUE";
      readonly amount: number;
    }
  | {
      readonly responseId: string;
      readonly type: "GRANT_SHIELD";
      readonly amount: number;
    };

/**
 * 方法名：resolveAttackDefenseResponses
 * 作用：按提交顺序汇总已获准的主动防御响应，并在取消攻击后停止继续处理。
 * @param responses 已通过各自使用条件校验的主动防御响应序列。
 * @returns 可直接交给基础攻击流程使用的统一防御结果。
 * @throws 响应标识重复、类型不支持或效果数值非法时抛出错误。
 */
export function resolveAttackDefenseResponses(
  responses: readonly AttackDefenseResponse[],
): AttackDefenseResolution {
  const responseIds = new Set<string>();
  const resolvedResponseIds: string[] = [];
  let evasionRateModifier = 0;
  let attackValueModifier = 0;
  let shieldGranted = 0;

  for (const response of responses) {
    validateAttackDefenseResponse(response, responseIds);
    resolvedResponseIds.push(response.responseId);

    if (response.type === "CANCEL") {
      return Object.freeze({
        cancelled: true,
        evasionRateModifier,
        attackValueModifier,
        shieldGranted,
        resolvedResponseIds: Object.freeze(resolvedResponseIds),
      });
    }

    if (response.type === "MODIFY_EVASION") {
      evasionRateModifier = addSafeIntegers(
        evasionRateModifier,
        response.amount,
        "evasionRateModifier",
      );
      continue;
    }

    if (response.type === "MODIFY_ATTACK_VALUE") {
      attackValueModifier = addSafeIntegers(
        attackValueModifier,
        response.amount,
        "attackValueModifier",
      );
      continue;
    }

    shieldGranted = addSafeIntegers(shieldGranted, response.amount, "shieldGranted");
  }

  return Object.freeze({
    cancelled: false,
    evasionRateModifier,
    attackValueModifier,
    shieldGranted,
    resolvedResponseIds: Object.freeze(resolvedResponseIds),
  });
}

/**
 * 方法名：validateAttackDefenseResponse
 * 作用：校验单项主动防御响应的标识、类型与效果数值。
 * @param response 需要校验的主动防御响应。
 * @param responseIds 已处理响应标识集合。
 * @returns 无返回值。
 * @throws 响应标识重复、类型不支持或数值非法时抛出错误。
 */
function validateAttackDefenseResponse(
  response: AttackDefenseResponse,
  responseIds: Set<string>,
): void {
  if (typeof response.responseId !== "string" || response.responseId.trim().length === 0) {
    throw new TypeError("responseId must be a non-empty string");
  }

  if (responseIds.has(response.responseId)) {
    throw new Error(`Duplicate defense response id: ${response.responseId}`);
  }

  responseIds.add(response.responseId);

  if (!ATTACK_DEFENSE_RESPONSE_TYPES.includes(response.type)) {
    throw new RangeError(`Unsupported defense response type: ${response.type as string}`);
  }

  if (response.type === "CANCEL") {
    return;
  }

  if (!Number.isSafeInteger(response.amount)) {
    throw new TypeError(`Defense response amount must be a safe integer: ${response.responseId}`);
  }

  if (response.type === "GRANT_SHIELD" && response.amount <= 0) {
    throw new RangeError(`Shield response amount must be positive: ${response.responseId}`);
  }

  if (response.type !== "GRANT_SHIELD" && response.amount === 0) {
    throw new RangeError(`Defense response amount must not be zero: ${response.responseId}`);
  }
}

/**
 * 方法名：addSafeIntegers
 * 作用：累加主动防御修正并确保结果仍处于安全整数范围。
 * @param left 当前累计值。
 * @param right 本次需要加入的修正值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 安全的整数累加结果。
 * @throws 累加结果超出安全整数范围时抛出错误。
 */
function addSafeIntegers(left: number, right: number, field: string): number {
  const result = left + right;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`${field} exceeds the safe integer range`);
  }

  return result;
}
