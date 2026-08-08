import { DAY_NIGHT_PHASE_DURATION_ROUNDS } from "./weather-config.ts";

/** 描述当前公开昼夜阶段及其轮次进度。 */
export interface DayNightState {
  readonly periodId: "day" | "night";
  readonly elapsedRounds: number;
  readonly remainingRounds: number;
  readonly phaseIndex: number;
}

/**
 * 方法名：getDayNightState
 * 作用：根据完整轮次编号计算稳定且不受天气影响的昼夜阶段。
 * @param round 当前完整轮次编号。
 * @returns 当前昼夜、阶段进度和距离切换的剩余轮数。
 */
export function getDayNightState(round: number): DayNightState {
  if (!Number.isSafeInteger(round) || round <= 0) {
    throw new RangeError("round must be a positive safe integer");
  }

  const phaseIndex = Math.floor((round - 1) / DAY_NIGHT_PHASE_DURATION_ROUNDS);
  const elapsedRounds = ((round - 1) % DAY_NIGHT_PHASE_DURATION_ROUNDS) + 1;

  return Object.freeze({
    periodId: phaseIndex % 2 === 0 ? "day" : "night",
    elapsedRounds,
    remainingRounds: DAY_NIGHT_PHASE_DURATION_ROUNDS - elapsedRounds,
    phaseIndex,
  });
}
