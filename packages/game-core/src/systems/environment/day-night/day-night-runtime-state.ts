import {
  DAY_NIGHT_PERIOD_DEFINITION_CATALOG,
  DAY_NIGHT_PHASE_DURATION_ROUNDS,
} from "./day-night-config.ts";
import {
  getDayNightPeriodDefinition,
  validateDayNightPeriodDefinitionCatalog,
  type DayNightPeriodId,
} from "./day-night-definition.ts";

/** 描述当前公开昼夜阶段及其轮次进度。 */
export interface DayNightState {
  readonly periodId: DayNightPeriodId;
  readonly elapsedRounds: number;
  readonly remainingRounds: number;
  readonly phaseIndex: number;
}

/** 描述可持久化的世界昼夜运行时状态。 */
export interface DayNightRuntimeState {
  readonly currentRound: number;
  readonly current: DayNightState;
}

/** 描述提供给地图、事件、NPC 和其他公共系统的昼夜环境视图。 */
export interface DayNightEnvironmentView extends DayNightState {
  readonly publicTags: readonly string[];
  readonly visionModifier: number;
}

/**
 * 方法名：getDayNightState
 * 作用：根据完整轮次编号计算稳定且不受天气影响的昼夜阶段。
 * @param round 当前完整轮次编号。
 * @returns 当前昼夜、阶段进度和距离切换的剩余轮数。
 * @throws 轮次编号不是正安全整数时抛出错误。
 */
export function getDayNightState(round: number): DayNightState {
  assertPositiveSafeInteger(round, "round");
  const phaseIndex = Math.floor((round - 1) / DAY_NIGHT_PHASE_DURATION_ROUNDS);
  const elapsedRounds = ((round - 1) % DAY_NIGHT_PHASE_DURATION_ROUNDS) + 1;

  return Object.freeze({
    periodId: phaseIndex % 2 === 0 ? "day" : "night",
    elapsedRounds,
    remainingRounds: DAY_NIGHT_PHASE_DURATION_ROUNDS - elapsedRounds,
    phaseIndex,
  });
}

/**
 * 方法名：createDayNightRuntimeState
 * 作用：根据当前完整轮次建立可持久化且公开的昼夜运行时状态。
 * @param currentRound 当前正在进行的完整轮次编号，默认从第一轮白天开始。
 * @returns 冻结后的昼夜运行时状态。
 * @throws 轮次编号不是正安全整数时抛出错误。
 */
export function createDayNightRuntimeState(currentRound = 1): DayNightRuntimeState {
  return Object.freeze({
    currentRound,
    current: getDayNightState(currentRound),
  });
}

/**
 * 方法名：getDayNightEnvironmentView
 * 作用：生成其他系统可安全读取的昼夜标签、视野修正与阶段进度视图。
 * @param state 当前昼夜运行时状态。
 * @returns 包含公开标签和视野修正的冻结环境视图。
 * @throws 运行时状态或阶段定义配置非法时抛出错误。
 */
export function getDayNightEnvironmentView(state: DayNightRuntimeState): DayNightEnvironmentView {
  validateDayNightRuntimeState(state);
  validateDayNightPeriodDefinitionCatalog(DAY_NIGHT_PERIOD_DEFINITION_CATALOG);
  const definition = getDayNightPeriodDefinition(
    DAY_NIGHT_PERIOD_DEFINITION_CATALOG,
    state.current.periodId,
  );

  return Object.freeze({
    ...state.current,
    publicTags: Object.freeze([...definition.publicTags]),
    visionModifier: definition.visionModifier,
  });
}

/**
 * 方法名：validateDayNightRuntimeState
 * 作用：校验持久化昼夜状态与当前轮次的确定性推导结果完全一致。
 * @param state 需要校验的昼夜运行时状态。
 * @returns 无返回值。
 * @throws 轮次非法或阶段进度不是轮次推导结果时抛出错误。
 */
export function validateDayNightRuntimeState(state: DayNightRuntimeState): void {
  const expected = getDayNightState(state.currentRound);

  if (
    state.current.periodId !== expected.periodId ||
    state.current.elapsedRounds !== expected.elapsedRounds ||
    state.current.remainingRounds !== expected.remainingRounds ||
    state.current.phaseIndex !== expected.phaseIndex
  ) {
    throw new Error("Day-night state must match its current round");
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
