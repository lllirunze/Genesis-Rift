import { RandomStream, type RandomStreamState } from "./random-stream.ts";
import type { MasterSeed } from "./random-seed.ts";
import { createMasterSeed } from "./random-seed.ts";
import type { RandomStreamType } from "./random-stream-type.ts";
import { deriveRandomStreamSeed, RANDOM_ALGORITHM_ID } from "./seed-deriver.ts";

export interface RandomManagerState {
  readonly algorithmId: typeof RANDOM_ALGORITHM_ID;
  readonly masterSeed: MasterSeed;
  readonly streams: readonly RandomStreamState[];
}

export class RandomManager {
  private readonly masterSeed: MasterSeed;
  private readonly streams = new Map<string, RandomStream>();

  private constructor(masterSeed: MasterSeed) {
    this.masterSeed = masterSeed;
  }

  static create(masterSeed: MasterSeed): RandomManager {
    return new RandomManager(createMasterSeed(masterSeed));
  }

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

function createStreamKey(streamType: RandomStreamType, scopeId: string | null): string {
  if (scopeId !== null && scopeId.length === 0) {
    throw new TypeError("scopeId must not be empty");
  }

  return `${streamType.length}:${streamType}|${scopeId === null ? "-" : `${scopeId.length}:${scopeId}`}`;
}
