import type { RandomStream } from "../random/core/random-stream.ts";
import { rollD20 } from "../random/service/dice.ts";

import {
  DOUBLE_D20_FAILURE_THRESHOLD,
  GUARANTEED_REINCARNATION_FAILURE_THRESHOLD,
  REINCARNATION_SUCCESS_ROLL,
} from "./revival-config.ts";
import { validateSoulState, type SoulState } from "./soul-state.ts";

/** 描述一次轮回申请的结构化判定结果。 */
export type ReincarnationAttemptResult =
  | {
      readonly outcome: "FAILED";
      readonly rolls: readonly number[];
      readonly state: SoulState;
    }
  | {
      readonly outcome: "SUCCEEDED";
      readonly rolls: readonly number[];
      readonly state: SoulState;
    };

/**
 * 方法名：attemptReincarnation
 * 作用：为已准备完成的灵魂执行一次 D20 轮回申请，并应用连续失败保底规则。
 * @param state 当前已通过等待阶段的灵魂运行时状态。
 * @param randomStream 当前对局专用于轮回的独立随机流。
 * @param currentTurn 灵魂所属玩家当前正在结算的自身回合编号。
 * @returns 包含骰子结果、成功或失败结果及更新后灵魂状态的不可变对象。
 * @throws 灵魂尚未准备完成、同一回合重复申请或回合编号非法时抛出错误。
 */
export function attemptReincarnation(
  state: SoulState,
  randomStream: RandomStream,
  currentTurn: number,
): ReincarnationAttemptResult {
  validateSoulState(state);
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  if (state.status !== "READY") {
    throw new Error("Only ready souls can attempt reincarnation");
  }

  if (state.lastAttemptTurn === currentTurn) {
    throw new Error("A soul can only attempt reincarnation once per owner turn");
  }

  if (state.failedAttemptCount >= GUARANTEED_REINCARNATION_FAILURE_THRESHOLD) {
    return createSuccessfulResult(state, [], currentTurn);
  }

  const rollCount = state.failedAttemptCount >= DOUBLE_D20_FAILURE_THRESHOLD ? 2 : 1;
  const rolls = Object.freeze(Array.from({ length: rollCount }, () => rollD20(randomStream)));

  if (rolls.some((roll) => roll === REINCARNATION_SUCCESS_ROLL)) {
    return createSuccessfulResult(state, rolls, currentTurn);
  }

  return Object.freeze({
    outcome: "FAILED",
    rolls,
    state: Object.freeze({
      ...state,
      failedAttemptCount: state.failedAttemptCount + 1,
      lastAttemptTurn: currentTurn,
    }),
  });
}

/** 创建成功轮回后的固定结果，并清空连续失败计数。 */
function createSuccessfulResult(
  state: SoulState,
  rolls: readonly number[],
  currentTurn: number,
): ReincarnationAttemptResult {
  return Object.freeze({
    outcome: "SUCCEEDED",
    rolls,
    state: Object.freeze({
      ...state,
      status: "REINCARNATED",
      failedAttemptCount: 0,
      lastAttemptTurn: currentTurn,
    }),
  });
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
