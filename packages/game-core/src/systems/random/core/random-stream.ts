import { MAX_RANDOM_INTEGER_RANGE, RANDOM_ALGORITHM_ID } from "./random-config.ts";
import type { RandomStreamSeed } from "./random-seed.ts";
import { createRandomStreamSeed } from "./random-seed.ts";
import type { RandomStreamType } from "./random-stream-type.ts";
import { isRandomStreamType } from "./random-stream-type.ts";

const UINT64_MASK = 0xffff_ffff_ffff_ffffn;
const SPLITMIX_INCREMENT = 0x9e37_79b9_7f4a_7c15n;
const SPLITMIX_MULTIPLIER_ONE = 0xbf58_476d_1ce4_e5b9n;
const SPLITMIX_MULTIPLIER_TWO = 0x94d0_49bb_1331_11ebn;

export interface RandomStreamState {
  readonly algorithmId: typeof RANDOM_ALGORITHM_ID;
  readonly streamType: RandomStreamType;
  readonly scopeId: string | null;
  readonly initialSeed: RandomStreamSeed;
  readonly currentState: RandomStreamSeed;
  readonly callCount: number;
}

export class RandomStream {
  readonly streamType: RandomStreamType;
  readonly scopeId: string | null;
  readonly initialSeed: RandomStreamSeed;

  private currentState: bigint;
  private callCount: number;

  private constructor(state: RandomStreamState) {
    this.streamType = state.streamType;
    this.scopeId = state.scopeId;
    this.initialSeed = state.initialSeed;
    this.currentState = BigInt(`0x${state.currentState}`);
    this.callCount = state.callCount;
  }

  static create(
    streamType: RandomStreamType,
    scopeId: string | null,
    seed: RandomStreamSeed,
  ): RandomStream {
    return new RandomStream({
      algorithmId: RANDOM_ALGORITHM_ID,
      streamType,
      scopeId,
      initialSeed: seed,
      currentState: seed,
      callCount: 0,
    });
  }

  static restore(state: RandomStreamState): RandomStream {
    validateRandomStreamState(state);
    return new RandomStream(state);
  }

  nextInt(minInclusive: number, maxExclusive: number): number {
    validateIntegerRange(minInclusive, maxExclusive);

    const range = maxExclusive - minInclusive;
    const rejectionLimit = Math.floor(MAX_RANDOM_INTEGER_RANGE / range) * range;
    let sample: number;

    do {
      sample = this.nextUint32();
    } while (sample >= rejectionLimit);

    this.callCount += 1;
    return minInclusive + (sample % range);
  }

  shuffle<Item>(items: readonly Item[]): Item[] {
    const shuffledItems = [...items];

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index + 1);
      const currentItem = shuffledItems[index];

      shuffledItems[index] = shuffledItems[swapIndex]!;
      shuffledItems[swapIndex] = currentItem!;
    }

    return shuffledItems;
  }

  exportState(): RandomStreamState {
    return {
      algorithmId: RANDOM_ALGORITHM_ID,
      streamType: this.streamType,
      scopeId: this.scopeId,
      initialSeed: this.initialSeed,
      currentState: formatUint64(this.currentState),
      callCount: this.callCount,
    };
  }

  private nextUint32(): number {
    this.currentState = (this.currentState + SPLITMIX_INCREMENT) & UINT64_MASK;

    let value = this.currentState;
    value = ((value ^ (value >> 30n)) * SPLITMIX_MULTIPLIER_ONE) & UINT64_MASK;
    value = ((value ^ (value >> 27n)) * SPLITMIX_MULTIPLIER_TWO) & UINT64_MASK;
    value ^= value >> 31n;

    return Number((value & UINT64_MASK) >> 32n);
  }
}

function validateIntegerRange(minInclusive: number, maxExclusive: number): void {
  if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
    throw new TypeError("integer random bounds must be safe integers");
  }

  const range = maxExclusive - minInclusive;

  if (range <= 0) {
    throw new RangeError("maxExclusive must be greater than minInclusive");
  }

  if (range > MAX_RANDOM_INTEGER_RANGE) {
    throw new RangeError(`integer random range must not exceed ${MAX_RANDOM_INTEGER_RANGE}`);
  }
}

function validateRandomStreamState(state: RandomStreamState): void {
  if (state.algorithmId !== RANDOM_ALGORITHM_ID) {
    throw new Error(`Unsupported random algorithm: ${state.algorithmId as string}`);
  }

  if (!isRandomStreamType(state.streamType)) {
    throw new TypeError(`Unknown random stream type: ${state.streamType as string}`);
  }

  if (state.scopeId !== null && state.scopeId.length === 0) {
    throw new TypeError("scopeId must not be empty");
  }

  createRandomStreamSeed(state.initialSeed);
  createRandomStreamSeed(state.currentState);

  if (!Number.isSafeInteger(state.callCount) || state.callCount < 0) {
    throw new TypeError("callCount must be a non-negative safe integer");
  }
}

function formatUint64(value: bigint): RandomStreamSeed {
  return createRandomStreamSeed((value & UINT64_MASK).toString(16).padStart(16, "0"));
}
