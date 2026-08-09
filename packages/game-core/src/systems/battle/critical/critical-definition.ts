import { CRITICAL_RATE_SCALE } from "./critical-config.ts";

/** 描述一次暴击判定所需的攻击方输入。 */
export interface CriticalCheckInput {
  readonly criticalEnabled: boolean;
  readonly sourceCriticalRate: number;
}

/** 描述一次暴击判定的可记录结果。 */
export interface CriticalCheckResult {
  readonly criticalEnabled: boolean;
  readonly sourceCriticalRate: number;
  readonly roll: number | null;
  readonly critical: boolean;
}

/**
 * 方法名：validateCriticalCheckInput
 * 作用：校验暴击判定使用的开关和攻击方暴击率。
 * @param input 需要校验的暴击判定输入。
 * @returns 无返回值。
 * @throws 输入不是合法布尔值，或暴击率不在百分制整数范围内时抛出错误。
 */
export function validateCriticalCheckInput(input: CriticalCheckInput): void {
  if (typeof input.criticalEnabled !== "boolean") {
    throw new TypeError("criticalEnabled must be a boolean");
  }

  if (!Number.isSafeInteger(input.sourceCriticalRate)) {
    throw new TypeError("sourceCriticalRate must be a safe integer");
  }

  if (input.sourceCriticalRate < 0 || input.sourceCriticalRate > CRITICAL_RATE_SCALE) {
    throw new RangeError(`sourceCriticalRate must be between 0 and ${CRITICAL_RATE_SCALE}`);
  }
}
