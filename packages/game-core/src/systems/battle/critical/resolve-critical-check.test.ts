import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import { CRITICAL_RATE_SCALE } from "./critical-config.ts";
import { resolveCriticalCheck } from "./resolve-critical-check.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createCombatStream
 * 作用：创建用于暴击判定测试的确定性战斗随机流。
 * @returns 初始状态一致的战斗随机流。
 */
function createCombatStream(): RandomStream {
  return RandomStream.create("combat", null, STREAM_SEED);
}

describe("critical check", () => {
  it("uses only the attacker critical rate and records a reproducible integer roll", () => {
    const firstStream = createCombatStream();
    const secondStream = createCombatStream();
    const input = { criticalEnabled: true, sourceCriticalRate: 35 } as const;

    const firstResult = resolveCriticalCheck(firstStream, input);
    const secondResult = resolveCriticalCheck(secondStream, input);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.roll).not.toBeNull();
    expect(firstResult.roll).toBeGreaterThanOrEqual(0);
    expect(firstResult.roll).toBeLessThan(CRITICAL_RATE_SCALE);
    expect(firstResult.critical).toBe((firstResult.roll as number) < input.sourceCriticalRate);
    expect(firstStream.exportState().callCount).toBe(1);
  });

  it("does not consume random values when critical checks are disabled", () => {
    const stream = createCombatStream();

    expect(
      resolveCriticalCheck(stream, { criticalEnabled: false, sourceCriticalRate: 35 }),
    ).toEqual({
      criticalEnabled: false,
      sourceCriticalRate: 35,
      roll: null,
      critical: false,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("returns deterministic boundary results without consuming random values", () => {
    const stream = createCombatStream();

    expect(resolveCriticalCheck(stream, { criticalEnabled: true, sourceCriticalRate: 0 })).toEqual({
      criticalEnabled: true,
      sourceCriticalRate: 0,
      roll: null,
      critical: false,
    });
    expect(
      resolveCriticalCheck(stream, {
        criticalEnabled: true,
        sourceCriticalRate: CRITICAL_RATE_SCALE,
      }),
    ).toEqual({
      criticalEnabled: true,
      sourceCriticalRate: CRITICAL_RATE_SCALE,
      roll: null,
      critical: true,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("rejects invalid rates without consuming random values", () => {
    const stream = createCombatStream();
    const initialState = stream.exportState();

    expect(() =>
      resolveCriticalCheck(stream, { criticalEnabled: true, sourceCriticalRate: 1.5 }),
    ).toThrow(TypeError);
    expect(() =>
      resolveCriticalCheck(stream, { criticalEnabled: true, sourceCriticalRate: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      resolveCriticalCheck(stream, {
        criticalEnabled: true,
        sourceCriticalRate: CRITICAL_RATE_SCALE + 1,
      }),
    ).toThrow(RangeError);
    expect(stream.exportState()).toEqual(initialState);
  });
});
