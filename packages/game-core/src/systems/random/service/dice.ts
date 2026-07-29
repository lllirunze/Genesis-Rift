import type { RandomStream } from "../core/random-stream.ts";

export function rollD6(randomStream: RandomStream): number {
  return randomStream.nextInt(1, 7);
}

export function rollD20(randomStream: RandomStream): number {
  return randomStream.nextInt(1, 21);
}
