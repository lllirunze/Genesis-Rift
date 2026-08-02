import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../core/random-seed.ts";
import { RandomStream } from "../core/random-stream.ts";
import { pickRandomItem, pickRandomItems } from "./random-selection-policy.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createStream
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createStream(): RandomStream {
  return RandomStream.create("loot", null, STREAM_SEED);
}

describe("random selection policy", () => {
  it("selects one item reproducibly without mutating the input", () => {
    const items = ["a", "b", "c", "d", "e"] as const;

    expect(pickRandomItem(createStream(), items)).toBe("b");
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("selects multiple unique items reproducibly", () => {
    const items = ["a", "b", "c", "d", "e"] as const;
    const result = pickRandomItems(createStream(), items, 3);
    const repeatedResult = pickRandomItems(createStream(), items, 3);

    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
    expect(repeatedResult).toEqual(result);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("does not advance the stream for deterministic selections", () => {
    const stream = createStream();

    expect(pickRandomItem(stream, ["only"])).toBe("only");
    expect(pickRandomItems(stream, ["a", "b"], 0)).toEqual([]);
    expect(stream.exportState().callCount).toBe(0);
  });

  it("rejects invalid selections before advancing the stream", () => {
    const stream = createStream();
    const initialState = stream.exportState();

    expect(() => pickRandomItem(stream, [])).toThrow(RangeError);
    expect(() => pickRandomItems(stream, ["a"], -1)).toThrow(RangeError);
    expect(() => pickRandomItems(stream, ["a"], 2)).toThrow(RangeError);
    expect(() => pickRandomItems(stream, ["a"], 0.5)).toThrow(TypeError);
    expect(stream.exportState()).toEqual(initialState);
  });
});
