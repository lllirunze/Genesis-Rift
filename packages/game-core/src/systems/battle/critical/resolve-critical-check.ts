import type { RandomStream } from "../../random/core/random-stream.ts";

import {
  validateCriticalCheckInput,
  type CriticalCheckInput,
  type CriticalCheckResult,
} from "./critical-definition.ts";
import { CRITICAL_RATE_SCALE } from "./critical-config.ts";

/**
 * 方法名：resolveCriticalCheck
 * 作用：使用战斗随机流结算一次仅由攻击方暴击率决定的暴击判定。
 * @param randomStream 当前对局的战斗随机流。
 * @param input 攻击方暴击开关与最终暴击率。
 * @returns 包含随机样本和最终是否暴击的可记录结果。
 * @throws 输入不满足百分制整数暴击规则时抛出错误。
 */
export function resolveCriticalCheck(
  randomStream: RandomStream,
  input: CriticalCheckInput,
): CriticalCheckResult {
  validateCriticalCheckInput(input);

  if (!input.criticalEnabled || input.sourceCriticalRate === 0) {
    return {
      criticalEnabled: input.criticalEnabled,
      sourceCriticalRate: input.sourceCriticalRate,
      roll: null,
      critical: false,
    };
  }

  if (input.sourceCriticalRate === CRITICAL_RATE_SCALE) {
    return {
      criticalEnabled: true,
      sourceCriticalRate: input.sourceCriticalRate,
      roll: null,
      critical: true,
    };
  }

  const roll = randomStream.nextInt(0, CRITICAL_RATE_SCALE);

  return {
    criticalEnabled: true,
    sourceCriticalRate: input.sourceCriticalRate,
    roll,
    critical: roll < input.sourceCriticalRate,
  };
}
