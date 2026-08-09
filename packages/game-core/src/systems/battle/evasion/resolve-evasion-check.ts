import type { RandomStream } from "../../random/core/random-stream.ts";

import {
  validateEvasionCheckInput,
  type EvasionCheckInput,
  type EvasionCheckResult,
} from "./evasion-definition.ts";
import { EVASION_RATE_SCALE } from "./evasion-config.ts";

/**
 * 方法名：resolveEvasionCheck
 * 作用：使用战斗随机流结算一次仅由防守方闪避率决定的自然闪避判定。
 * @param randomStream 当前对局的战斗随机流。
 * @param input 防守方闪避开关与最终闪避率。
 * @returns 包含随机样本和最终是否闪避的可记录结果。
 * @throws 输入不满足百分制整数闪避规则时抛出错误。
 */
export function resolveEvasionCheck(
  randomStream: RandomStream,
  input: EvasionCheckInput,
): EvasionCheckResult {
  validateEvasionCheckInput(input);

  if (!input.evasionEnabled || input.targetEvasionRate === 0) {
    return {
      evasionEnabled: input.evasionEnabled,
      targetEvasionRate: input.targetEvasionRate,
      roll: null,
      evaded: false,
    };
  }

  if (input.targetEvasionRate === EVASION_RATE_SCALE) {
    return {
      evasionEnabled: true,
      targetEvasionRate: input.targetEvasionRate,
      roll: null,
      evaded: true,
    };
  }

  const roll = randomStream.nextInt(0, EVASION_RATE_SCALE);

  return {
    evasionEnabled: true,
    targetEvasionRate: input.targetEvasionRate,
    roll,
    evaded: roll < input.targetEvasionRate,
  };
}
