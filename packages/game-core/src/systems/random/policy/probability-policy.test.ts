import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../core/random-seed.ts";
import { RandomStream } from "../core/random-stream.ts";
import { rollIntegerChance } from "./probability-policy.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createStream
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createStream(): RandomStream {
  return RandomStream.create("event", null, STREAM_SEED);
}

describe("integer probability policy", () => {
  it("performs reproducible chance checks without floating-point values", () => {
    const stream = createStream();

    expect(rollIntegerChance(stream, 25, 100)).toBe(false);
    expect(rollIntegerChance(stream, 50, 100)).toBe(false);
    expect(rollIntegerChance(stream, 31, 100)).toBe(true);
    expect(stream.exportState().callCount).toBe(3);
  });

  it("returns deterministic boundary results without advancing the stream", () => {
    const stream = createStream();

    expect(rollIntegerChance(stream, 0, 10_000)).toBe(false);
    expect(rollIntegerChance(stream, 10_000, 10_000)).toBe(true);
    expect(stream.exportState().callCount).toBe(0);
  });

  it("rejects invalid integer chance inputs without advancing the stream", () => {
    const stream = createStream();
    const initialState = stream.exportState();

    expect(() => rollIntegerChance(stream, 1.5, 100)).toThrow(TypeError);
    expect(() => rollIntegerChance(stream, -1, 100)).toThrow(RangeError);
    expect(() => rollIntegerChance(stream, 101, 100)).toThrow(RangeError);
    expect(() => rollIntegerChance(stream, 0, 0)).toThrow(RangeError);
    expect(() => rollIntegerChance(stream, 1, 0x1_0000_0001)).toThrow(RangeError);
    expect(stream.exportState()).toEqual(initialState);
  });
});
