import type { RandomStream } from "../core/random-stream.ts";

/**
 * 方法名：rollD6
 * 作用：执行该方法负责的单一业务操作。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function rollD6(randomStream: RandomStream): number {
  return randomStream.nextInt(1, 7);
}

/**
 * 方法名：rollD20
 * 作用：执行该方法负责的单一业务操作。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function rollD20(randomStream: RandomStream): number {
  return randomStream.nextInt(1, 21);
}
