import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../core/random-seed.ts";
import { RandomStream } from "../core/random-stream.ts";
import { pickWeightedItem } from "./weighted-random-policy.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createStream
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createStream(): RandomStream {
  return RandomStream.create("event", null, STREAM_SEED);
}

describe("weighted random policy", () => {
  it("selects items reproducibly using integer weights", () => {
    const stream = createStream();
    const weightedItems = [
      { item: "common", weight: 70 },
      { item: "rare", weight: 25 },
      { item: "legendary", weight: 5 },
    ] as const;

    expect(Array.from({ length: 5 }, () => pickWeightedItem(stream, weightedItems))).toEqual([
      "rare",
      "legendary",
      "common",
      "rare",
      "common",
    ]);
  });

  it("ignores zero-weight items", () => {
    const stream = createStream();

    expect(
      pickWeightedItem(stream, [
        { item: "disabled", weight: 0 },
        { item: "enabled", weight: 10 },
      ]),
    ).toBe("enabled");
    expect(stream.exportState().callCount).toBe(0);
  });

  it("rejects invalid weights before advancing the stream", () => {
    const stream = createStream();
    const initialState = stream.exportState();

    expect(() => pickWeightedItem(stream, [])).toThrow(RangeError);
    expect(() => pickWeightedItem(stream, [{ item: "a", weight: -1 }])).toThrow(RangeError);
    expect(() => pickWeightedItem(stream, [{ item: "a", weight: 1.5 }])).toThrow(TypeError);
    expect(() => pickWeightedItem(stream, [{ item: "a", weight: 0 }])).toThrow(RangeError);
    expect(() =>
      pickWeightedItem(stream, [
        { item: "a", weight: 0x1_0000_0000 },
        { item: "b", weight: 1 },
      ]),
    ).toThrow(RangeError);
    expect(stream.exportState()).toEqual(initialState);
  });
});
