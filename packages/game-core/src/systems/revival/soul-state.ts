import type { CharacterSurvivalState } from "../battle/survival/index.ts";

import {
  DEFAULT_REINCARNATION_WAIT_TURNS,
  SOUL_STATUSES,
  type SoulStatus,
} from "./revival-config.ts";

/** 描述正式死亡角色在等待轮回期间的独立运行时状态。 */
export interface SoulState {
  readonly participantId: string;
  readonly status: SoulStatus;
  readonly remainingWaitTurns: number;
  readonly failedAttemptCount: number;
  readonly lastAttemptTurn: number | null;
}

/** 描述灵魂等待阶段的一次推进结果。 */
export type AdvanceSoulWaitResult =
  | { readonly outcome: "NOT_WAITING"; readonly state: SoulState }
  | { readonly outcome: "WAIT_TICKED"; readonly state: SoulState }
  | { readonly outcome: "READY_FOR_REINCARNATION"; readonly state: SoulState };

/**
 * 方法名：createSoulStateFromDeath
 * 作用：在角色已经正式死亡后创建等待轮回的灵魂状态。
 * @param survivalState 已经完成击倒倒计时的角色生存状态。
 * @param waitTurns 灵魂在申请轮回前需要等待的自身回合数。
 * @returns 不可变的初始灵魂状态。
 * @throws 角色尚未正式死亡、参与者标识为空或等待回合数非法时抛出错误。
 */
export function createSoulStateFromDeath(
  survivalState: CharacterSurvivalState,
  waitTurns: number = DEFAULT_REINCARNATION_WAIT_TURNS,
): SoulState {
  if (survivalState.status !== "DEAD") {
    throw new Error("Only dead characters can enter the soul state");
  }

  assertNonEmptyString(survivalState.participantId, "survivalState.participantId");
  assertPositiveSafeInteger(waitTurns, "waitTurns");

  return Object.freeze({
    participantId: survivalState.participantId,
    status: "WAITING",
    remainingWaitTurns: waitTurns,
    failedAttemptCount: 0,
    lastAttemptTurn: null,
  });
}

/**
 * 方法名：createSoulStateForMidGameJoin
 * 作用：为已完成角色创建的中途加入者创建可立即申请轮回的灵魂入口状态。
 * @param participantId 中途加入玩家对应的角色运行时标识。
 * @returns 不可变的可申请轮回灵魂状态，不包含死亡等待或历史失败次数。
 * @throws 角色标识为空时抛出错误。
 */
export function createSoulStateForMidGameJoin(participantId: string): SoulState {
  assertNonEmptyString(participantId, "participantId");

  return Object.freeze({
    participantId,
    status: "READY",
    remainingWaitTurns: 0,
    failedAttemptCount: 0,
    lastAttemptTurn: null,
  });
}

/**
 * 方法名：advanceSoulWaitAtOwnerTurnEnd
 * 作用：在灵魂所属玩家的回合结束时减少轮回等待时间，归零后开放轮回申请。
 * @param state 当前灵魂运行时状态。
 * @returns 未处于等待阶段、等待减少或已经可申请轮回的不可变结果。
 * @throws 灵魂状态字段不合法时抛出错误。
 */
export function advanceSoulWaitAtOwnerTurnEnd(state: SoulState): AdvanceSoulWaitResult {
  validateSoulState(state);

  if (state.status !== "WAITING") {
    return Object.freeze({ outcome: "NOT_WAITING", state });
  }

  const remainingWaitTurns = state.remainingWaitTurns - 1;

  if (remainingWaitTurns === 0) {
    return Object.freeze({
      outcome: "READY_FOR_REINCARNATION",
      state: Object.freeze({ ...state, status: "READY", remainingWaitTurns: 0 }),
    });
  }

  return Object.freeze({
    outcome: "WAIT_TICKED",
    state: Object.freeze({ ...state, remainingWaitTurns }),
  });
}

/**
 * 方法名：validateSoulState
 * 作用：校验灵魂阶段与等待回合数之间的状态一致性。
 * @param state 需要校验的灵魂运行时状态。
 * @returns 无返回值。
 * @throws 参与者标识、状态或等待回合数不符合规则时抛出错误。
 */
export function validateSoulState(state: SoulState): void {
  assertNonEmptyString(state.participantId, "participantId");

  if (!SOUL_STATUSES.includes(state.status)) {
    throw new RangeError(`Unsupported soul status: ${state.status}`);
  }

  if (!Number.isSafeInteger(state.remainingWaitTurns) || state.remainingWaitTurns < 0) {
    throw new RangeError("remainingWaitTurns must be a non-negative safe integer");
  }

  if (state.status === "WAITING" && state.remainingWaitTurns === 0) {
    throw new Error("Waiting souls must have at least one remaining wait turn");
  }

  if (state.status === "READY" && state.remainingWaitTurns !== 0) {
    throw new Error("Ready souls cannot retain waiting turns");
  }

  if (state.status === "REINCARNATED" && state.remainingWaitTurns !== 0) {
    throw new Error("Reincarnated souls cannot retain waiting turns");
  }

  if (!Number.isSafeInteger(state.failedAttemptCount) || state.failedAttemptCount < 0) {
    throw new RangeError("failedAttemptCount must be a non-negative safe integer");
  }

  if (state.lastAttemptTurn !== null) {
    if (!Number.isSafeInteger(state.lastAttemptTurn) || state.lastAttemptTurn < 0) {
      throw new RangeError("lastAttemptTurn must be a non-negative safe integer or null");
    }
  }

  if (state.status === "WAITING" && state.failedAttemptCount !== 0) {
    throw new Error("Waiting souls cannot retain failed reincarnation attempts");
  }
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
