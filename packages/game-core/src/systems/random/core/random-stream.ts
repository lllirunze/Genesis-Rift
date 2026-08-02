import { MAX_RANDOM_INTEGER_RANGE, RANDOM_ALGORITHM_ID } from "./random-config.ts";
import type { RandomStreamSeed } from "./random-seed.ts";
import { createRandomStreamSeed } from "./random-seed.ts";
import type { RandomStreamType } from "./random-stream-type.ts";
import { isRandomStreamType } from "./random-stream-type.ts";

const UINT64_MASK = 0xffff_ffff_ffff_ffffn;
const SPLITMIX_INCREMENT = 0x9e37_79b9_7f4a_7c15n;
const SPLITMIX_MULTIPLIER_ONE = 0xbf58_476d_1ce4_e5b9n;
const SPLITMIX_MULTIPLIER_TWO = 0x94d0_49bb_1331_11ebn;

/** 描述业务对象在运行时保存的状态。 */
export interface RandomStreamState {
  readonly algorithmId: typeof RANDOM_ALGORITHM_ID;
  readonly streamType: RandomStreamType;
  readonly scopeId: string | null;
  readonly initialSeed: RandomStreamSeed;
  readonly currentState: RandomStreamSeed;
  readonly callCount: number;
}

/** 封装该模块的状态与操作入口。 */
export class RandomStream {
  readonly streamType: RandomStreamType;
  readonly scopeId: string | null;
  readonly initialSeed: RandomStreamSeed;

  private currentState: bigint;
  private callCount: number;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param state 当前业务状态。
   * @returns 无返回值。
   */
  private constructor(state: RandomStreamState) {
    this.streamType = state.streamType;
    this.scopeId = state.scopeId;
    this.initialSeed = state.initialSeed;
    this.currentState = BigInt(`0x${state.currentState}`);
    this.callCount = state.callCount;
  }

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param streamType 方法所需的 streamType 参数。
   * @param scopeId 方法所需的 scopeId 参数。
   * @param seed 方法所需的 seed 参数。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：restore
   * 作用：解析外部表示并恢复为受校验的业务对象。
   * @param state 当前业务状态。
   * @returns 本次处理得到的结果。
   */
  static restore(state: RandomStreamState): RandomStream {
    validateRandomStreamState(state);
    return new RandomStream(state);
  }

  /**
   * 方法名：nextInt
   * 作用：执行该方法负责的单一业务操作。
   * @param minInclusive 方法所需的 minInclusive 参数。
   * @param maxExclusive 方法所需的 maxExclusive 参数。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：shuffle
   * 作用：使用指定随机流生成可复现的随机顺序。
   * @param items 方法所需的 items 参数。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：exportState
   * 作用：将输入转换为稳定、可保存或可传输的表示。
   * @returns 本次处理得到的结果。
   */
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

  /**
   * 方法名：nextUint32
   * 作用：执行该方法负责的单一业务操作。
   * @returns 本次处理得到的结果。
   */
  private nextUint32(): number {
    this.currentState = (this.currentState + SPLITMIX_INCREMENT) & UINT64_MASK;

    let value = this.currentState;
    value = ((value ^ (value >> 30n)) * SPLITMIX_MULTIPLIER_ONE) & UINT64_MASK;
    value = ((value ^ (value >> 27n)) * SPLITMIX_MULTIPLIER_TWO) & UINT64_MASK;
    value ^= value >> 31n;

    return Number((value & UINT64_MASK) >> 32n);
  }
}

/**
 * 方法名：validateIntegerRange
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param minInclusive 方法所需的 minInclusive 参数。
 * @param maxExclusive 方法所需的 maxExclusive 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：validateRandomStreamState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：formatUint64
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
function formatUint64(value: bigint): RandomStreamSeed {
  return createRandomStreamSeed((value & UINT64_MASK).toString(16).padStart(16, "0"));
}
