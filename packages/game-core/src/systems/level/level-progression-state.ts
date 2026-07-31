import type { LevelSystemConfig } from "@genesis-rift/shared";

export interface LevelProgressionState {
  readonly currentLevel: number;
  readonly currentExperience: number;
}

export function createInitialLevelProgression(config: LevelSystemConfig): LevelProgressionState {
  return {
    currentLevel: config.initialLevel,
    currentExperience: 0,
  };
}

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
