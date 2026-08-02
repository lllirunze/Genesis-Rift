import { MAX_RANDOM_INTEGER_RANGE } from "../core/random-config.ts";
import type { RandomStream } from "../core/random-stream.ts";

/**
 * 方法名：rollIntegerChance
 * 作用：执行该方法负责的单一业务操作。
 * @param randomStream 方法所需的 randomStream 参数。
 * @param rate 方法所需的 rate 参数。
 * @param scale 方法所需的 scale 参数。
 * @returns 本次处理得到的结果。
 */
export function rollIntegerChance(
  randomStream: RandomStream,
  rate: number,
  scale: number,
): boolean {
  validateIntegerChance(rate, scale);

  if (rate === 0) {
    return false;
  }

  if (rate === scale) {
    return true;
  }

  return randomStream.nextInt(0, scale) < rate;
}

/**
 * 方法名：validateIntegerChance
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param rate 方法所需的 rate 参数。
 * @param scale 方法所需的 scale 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateIntegerChance(rate: number, scale: number): void {
  if (!Number.isSafeInteger(rate) || !Number.isSafeInteger(scale)) {
    throw new TypeError("chance rate and scale must be safe integers");
  }

  if (scale <= 0 || scale > MAX_RANDOM_INTEGER_RANGE) {
    throw new RangeError(`chance scale must be between 1 and ${MAX_RANDOM_INTEGER_RANGE}`);
  }

  if (rate < 0 || rate > scale) {
    throw new RangeError("chance rate must be between 0 and scale");
  }
}
