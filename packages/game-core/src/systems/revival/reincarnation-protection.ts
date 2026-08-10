import { DEFAULT_REINCARNATION_PROTECTION_TURNS } from "./revival-config.ts";

/** 描述轮回角色在重新入场后获得的临时敌对行为保护。 */
export interface ReincarnationProtectionState {
  readonly participantId: string;
  readonly remainingTurns: number;
}

/**
 * 方法名：createReincarnationProtection
 * 作用：为重新进入地图的角色创建固定回合数的轮回保护状态。
 * @param participantId 获得轮回保护的角色运行时标识。
 * @param durationTurns 轮回保护持续的自身回合数。
 * @returns 不可变的轮回保护状态。
 * @throws 角色标识为空或持续回合数非法时抛出错误。
 */
export function createReincarnationProtection(
  participantId: string,
  durationTurns: number = DEFAULT_REINCARNATION_PROTECTION_TURNS,
): ReincarnationProtectionState {
  assertNonEmptyString(participantId, "participantId");
  assertPositiveSafeInteger(durationTurns, "durationTurns");
  return Object.freeze({ participantId, remainingTurns: durationTurns });
}

/**
 * 方法名：advanceReincarnationProtectionAtTurnEnd
 * 作用：在保护角色自身回合结束时减少保护回合数，归零后移除保护。
 * @param protection 当前轮回保护状态。
 * @returns 保护仍然有效时返回新状态，结束时返回 null。
 * @throws 轮回保护字段非法时抛出错误。
 */
export function advanceReincarnationProtectionAtTurnEnd(
  protection: ReincarnationProtectionState,
): ReincarnationProtectionState | null {
  validateReincarnationProtection(protection);
  const remainingTurns = protection.remainingTurns - 1;

  return remainingTurns === 0 ? null : Object.freeze({ ...protection, remainingTurns });
}

/**
 * 方法名：breakReincarnationProtectionForHostileAction
 * 作用：在角色主动声明攻击、偷窃或其他敌对行为前立即移除轮回保护。
 * @param protection 当前轮回保护状态。
 * @returns 始终返回 null，表示后续行为应按无保护状态继续结算。
 */
export function breakReincarnationProtectionForHostileAction(
  protection: ReincarnationProtectionState,
): null {
  validateReincarnationProtection(protection);
  return null;
}

/**
 * 方法名：canInitiateHostileAction
 * 作用：判断角色当前是否允许主动发起敌对行为。
 * @param protection 角色当前轮回保护状态；无保护时传入 null。
 * @returns 始终返回 true；存在保护时，调用方应先移除保护再结算本次敌对行为。
 */
export function canInitiateHostileAction(protection: ReincarnationProtectionState | null): boolean {
  if (protection !== null) {
    validateReincarnationProtection(protection);
  }

  return true;
}

/**
 * 方法名：canBeTargetedByHostileAction
 * 作用：判断角色当前是否允许成为其他单位主动敌对行为的目标。
 * @param protection 角色当前轮回保护状态；无保护时传入 null。
 * @returns 无保护时返回 true，存在保护时返回 false。
 */
export function canBeTargetedByHostileAction(
  protection: ReincarnationProtectionState | null,
): boolean {
  if (protection !== null) {
    validateReincarnationProtection(protection);
  }

  return protection === null;
}

/** 校验轮回保护的角色标识与剩余持续回合数。 */
/**
 * 方法名：validateReincarnationProtection
 * 作用：校验轮回保护的角色标识与剩余持续回合数。
 * @param protection 需要校验的轮回保护状态。
 * @returns 无返回值。
 * @throws 角色标识或剩余回合数不符合规则时抛出错误。
 */
export function validateReincarnationProtection(protection: ReincarnationProtectionState): void {
  assertNonEmptyString(protection.participantId, "participantId");
  assertPositiveSafeInteger(protection.remainingTurns, "remainingTurns");
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
