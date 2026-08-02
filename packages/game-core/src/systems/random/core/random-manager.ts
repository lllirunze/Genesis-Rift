import { RandomStream, type RandomStreamState } from "./random-stream.ts";
import type { MasterSeed } from "./random-seed.ts";
import { createMasterSeed } from "./random-seed.ts";
import { RANDOM_ALGORITHM_ID } from "./random-config.ts";
import type { RandomStreamType } from "./random-stream-type.ts";
import { deriveRandomStreamSeed } from "./seed-deriver.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface RandomManagerState {
  readonly algorithmId: typeof RANDOM_ALGORITHM_ID;
  readonly masterSeed: MasterSeed;
  readonly streams: readonly RandomStreamState[];
}

/** 封装该模块的状态与操作入口。 */
export class RandomManager {
  private readonly masterSeed: MasterSeed;
  private readonly streams = new Map<string, RandomStream>();

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param masterSeed 方法所需的 masterSeed 参数。
   * @returns 无返回值。
   */
  private constructor(masterSeed: MasterSeed) {
    this.masterSeed = masterSeed;
  }

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param masterSeed 方法所需的 masterSeed 参数。
   * @returns 本次处理得到的结果。
   */
  static create(masterSeed: MasterSeed): RandomManager {
    return new RandomManager(createMasterSeed(masterSeed));
  }

  /**
   * 方法名：restore
   * 作用：解析外部表示并恢复为受校验的业务对象。
   * @param state 当前业务状态。
   * @returns 本次处理得到的结果。
   */
  static restore(state: RandomManagerState): RandomManager {
    if (state.algorithmId !== RANDOM_ALGORITHM_ID) {
      throw new Error(`Unsupported random algorithm: ${state.algorithmId as string}`);
    }

    const manager = RandomManager.create(state.masterSeed);

    for (const streamState of state.streams) {
      const streamKey = createStreamKey(streamState.streamType, streamState.scopeId);

      if (manager.streams.has(streamKey)) {
        throw new Error(`Duplicate random stream state: ${streamKey}`);
      }

      const expectedSeed = deriveRandomStreamSeed({
        masterSeed: manager.masterSeed,
        streamType: streamState.streamType,
        scopeId: streamState.scopeId,
      });

      if (streamState.initialSeed !== expectedSeed) {
        throw new Error(`Random stream seed does not match its identity: ${streamKey}`);
      }

      manager.streams.set(streamKey, RandomStream.restore(streamState));
    }

    return manager;
  }

  /**
   * 方法名：getStream
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param streamType 方法所需的 streamType 参数。
   * @param scopeId 方法所需的 scopeId 参数。
   * @returns 本次处理得到的结果。
   */
  getStream(streamType: RandomStreamType, scopeId: string | null = null): RandomStream {
    const streamKey = createStreamKey(streamType, scopeId);
    const existingStream = this.streams.get(streamKey);

    if (existingStream !== undefined) {
      return existingStream;
    }

    const seed = deriveRandomStreamSeed({
      masterSeed: this.masterSeed,
      streamType,
      scopeId,
    });
    const stream = RandomStream.create(streamType, scopeId, seed);

    this.streams.set(streamKey, stream);
    return stream;
  }

  /**
   * 方法名：exportState
   * 作用：将输入转换为稳定、可保存或可传输的表示。
   * @returns 本次处理得到的结果。
   */
  exportState(): RandomManagerState {
    const streams = [...this.streams.values()]
      .map((stream) => stream.exportState())
      .sort((left, right) =>
        createStreamKey(left.streamType, left.scopeId).localeCompare(
          createStreamKey(right.streamType, right.scopeId),
        ),
      );

    return {
      algorithmId: RANDOM_ALGORITHM_ID,
      masterSeed: this.masterSeed,
      streams,
    };
  }
}

/**
 * 方法名：createStreamKey
 * 作用：创建并校验该方法所负责的业务对象。
 * @param streamType 方法所需的 streamType 参数。
 * @param scopeId 方法所需的 scopeId 参数。
 * @returns 本次处理得到的结果。
 */
function createStreamKey(streamType: RandomStreamType, scopeId: string | null): string {
  if (scopeId !== null && scopeId.length === 0) {
    throw new TypeError("scopeId must not be empty");
  }

  return `${streamType.length}:${streamType}|${scopeId === null ? "-" : `${scopeId.length}:${scopeId}`}`;
}
