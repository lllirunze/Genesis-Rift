import { EVASION_RATE_SCALE } from "./evasion-config.ts";

/** 描述一次自然闪避判定所需的防守方输入。 */
export interface EvasionCheckInput {
  readonly evasionEnabled: boolean;
  readonly targetEvasionRate: number;
}

/** 描述一次自然闪避判定的可记录结果。 */
export interface EvasionCheckResult {
  readonly evasionEnabled: boolean;
  readonly targetEvasionRate: number;
  readonly roll: number | null;
  readonly evaded: boolean;
}

/**
 * 方法名：validateEvasionCheckInput
 * 作用：校验自然闪避判定使用的开关和防守方闪避率。
 * @param input 需要校验的自然闪避判定输入。
 * @returns 无返回值。
 * @throws 输入不是合法布尔值，或闪避率不在百分制整数范围内时抛出错误。
 */
export function validateEvasionCheckInput(input: EvasionCheckInput): void {
  if (typeof input.evasionEnabled !== "boolean") {
    throw new TypeError("evasionEnabled must be a boolean");
  }

  if (!Number.isSafeInteger(input.targetEvasionRate)) {
    throw new TypeError("targetEvasionRate must be a safe integer");
  }

  if (input.targetEvasionRate < 0 || input.targetEvasionRate > EVASION_RATE_SCALE) {
    throw new RangeError(`targetEvasionRate must be between 0 and ${EVASION_RATE_SCALE}`);
  }
}
