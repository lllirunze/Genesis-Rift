import {
  createDayNightRuntimeState,
  validateDayNightRuntimeState,
  type DayNightRuntimeState,
} from "./day-night-runtime-state.ts";

/** 描述完整轮次结束后昼夜阶段是否发生切换。 */
export interface AdvanceDayNightRoundResult {
  readonly state: DayNightRuntimeState;
  readonly periodChanged: boolean;
}

/**
 * 方法名：advanceDayNightRound
 * 作用：仅在完整轮次边界推进昼夜状态，并返回是否进入新的昼夜阶段。
 * @param state 当前完整轮次对应的昼夜运行时状态。
 * @returns 下一完整轮次的昼夜状态及阶段切换结果。
 * @throws 当前状态非法或轮次递增超出安全整数范围时抛出错误。
 */
export function advanceDayNightRound(state: DayNightRuntimeState): AdvanceDayNightRoundResult {
  validateDayNightRuntimeState(state);

  if (state.currentRound >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Cannot advance day-night state beyond safe integer range");
  }

  const nextState = createDayNightRuntimeState(state.currentRound + 1);

  return Object.freeze({
    state: nextState,
    periodChanged: state.current.periodId !== nextState.current.periodId,
  });
}
