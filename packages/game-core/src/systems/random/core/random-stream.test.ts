import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "./random-seed.ts";
import { RandomStream } from "./random-stream.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createWeatherStream
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createWeatherStream(): RandomStream {
  return RandomStream.create("weather", null, STREAM_SEED);
}

describe("RandomStream", () => {
  it("produces a stable golden integer sequence", () => {
    const stream = createWeatherStream();
    const values = Array.from({ length: 8 }, () => stream.nextInt(0, 100));

    expect(values).toEqual([71, 95, 30, 75, 9, 36, 28, 55]);
    expect(stream.exportState()).toEqual({
      algorithmId: "splitmix64-v1",
      streamType: "weather",
      scopeId: null,
      initialSeed: STREAM_SEED,
      currentState: "f2df133383ffae97",
      callCount: 8,
    });
  });

  it("returns integers inside a left-closed, right-open range", () => {
    const stream = createWeatherStream();

    for (let index = 0; index < 500; index += 1) {
      const value = stream.nextInt(-3, 7);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThan(7);
    }
  });

  it("does not advance when integer range validation fails", () => {
    const stream = createWeatherStream();
    const stateBeforeInvalidCalls = stream.exportState();

    expect(() => stream.nextInt(5, 5)).toThrow(RangeError);
    expect(() => stream.nextInt(0.5, 2)).toThrow(TypeError);
    expect(() => stream.nextInt(0, 0x1_0000_0001)).toThrow(RangeError);
    expect(stream.exportState()).toEqual(stateBeforeInvalidCalls);
  });

  it("continues with the same sequence after state restoration", () => {
    const stream = createWeatherStream();

    stream.nextInt(0, 100);
    stream.nextInt(0, 100);

    const restoredStream = RandomStream.restore(stream.exportState());
    const uninterruptedValues = Array.from({ length: 5 }, () => stream.nextInt(0, 100));
    const restoredValues = Array.from({ length: 5 }, () => restoredStream.nextInt(0, 100));

    expect(restoredValues).toEqual(uninterruptedValues);
  });

  it("shuffles a copy deterministically without mutating the input", () => {
    const items = ["a", "b", "c", "d", "e"] as const;
    const firstStream = createWeatherStream();
    const secondStream = createWeatherStream();

    const firstResult = firstStream.shuffle(items);
    const secondResult = secondStream.shuffle(items);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult).not.toEqual(items);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });
});
