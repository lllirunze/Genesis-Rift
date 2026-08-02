import type { LevelSystemConfig } from "@genesis-rift/shared";

/** 描述业务对象在运行时保存的状态。 */
export interface LevelProgressionState {
  readonly currentLevel: number;
  readonly currentExperience: number;
}

/**
 * 方法名：createInitialLevelProgression
 * 作用：创建并校验该方法所负责的业务对象。
 * @param config 待使用或校验的配置。
 * @returns 本次处理得到的结果。
 */
export function createInitialLevelProgression(config: LevelSystemConfig): LevelProgressionState {
  return {
    currentLevel: config.initialLevel,
    currentExperience: 0,
  };
}

/**
 * 方法名：validateLevelProgressionState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param config 待使用或校验的配置。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateLevelProgressionState(
  state: LevelProgressionState,
  config: LevelSystemConfig,
): void {
  if (!Number.isSafeInteger(state.currentLevel)) {
    throw new TypeError("currentLevel must be a safe integer");
  }

  if (state.currentLevel < config.initialLevel || state.currentLevel > config.maximumLevel) {
    throw new RangeError(
      `currentLevel must be between ${config.initialLevel} and ${config.maximumLevel}`,
    );
  }

  if (!Number.isSafeInteger(state.currentExperience) || state.currentExperience < 0) {
    throw new TypeError("currentExperience must be a non-negative safe integer");
  }
}

/**
 * 方法名：grantExperience
 * 作用：在保持既有约束的前提下添加目标数据。
 * @param state 当前业务状态。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function grantExperience(
  state: LevelProgressionState,
  amount: number,
): LevelProgressionState {
  if (!Number.isSafeInteger(state.currentExperience) || state.currentExperience < 0) {
    throw new TypeError("currentExperience must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new TypeError("experience amount must be a non-negative safe integer");
  }

  const currentExperience = state.currentExperience + amount;

  if (!Number.isSafeInteger(currentExperience)) {
    throw new RangeError("currentExperience exceeds the safe integer range");
  }

  return {
    ...state,
    currentExperience,
  };
}
