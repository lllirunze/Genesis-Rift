import { MAX_RANDOM_INTEGER_RANGE, type RandomStream } from "../core/random-stream.ts";

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
