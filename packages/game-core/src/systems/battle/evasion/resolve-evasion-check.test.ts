import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import { EVASION_RATE_SCALE } from "./evasion-config.ts";
import { resolveEvasionCheck } from "./resolve-evasion-check.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createCombatStream
 * 作用：创建用于自然闪避测试的确定性战斗随机流。
 * @returns 初始状态一致的战斗随机流。
 */
function createCombatStream(): RandomStream {
  return RandomStream.create("combat", null, STREAM_SEED);
}

describe("natural evasion check", () => {
  it("uses only the defender evasion rate and records a reproducible integer roll", () => {
    const firstStream = createCombatStream();
    const secondStream = createCombatStream();
    const input = { evasionEnabled: true, targetEvasionRate: 35 } as const;

    const firstResult = resolveEvasionCheck(firstStream, input);
    const secondResult = resolveEvasionCheck(secondStream, input);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.roll).not.toBeNull();
    expect(firstResult.roll).toBeGreaterThanOrEqual(0);
    expect(firstResult.roll).toBeLessThan(EVASION_RATE_SCALE);
    expect(firstResult.evaded).toBe((firstResult.roll as number) < input.targetEvasionRate);
    expect(firstStream.exportState().callCount).toBe(1);
  });

  it("does not consume random values when evasion is skipped", () => {
    const stream = createCombatStream();

    expect(resolveEvasionCheck(stream, { evasionEnabled: false, targetEvasionRate: 35 })).toEqual({
      evasionEnabled: false,
      targetEvasionRate: 35,
      roll: null,
      evaded: false,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("returns deterministic boundary results without consuming random values", () => {
    const stream = createCombatStream();

    expect(resolveEvasionCheck(stream, { evasionEnabled: true, targetEvasionRate: 0 })).toEqual({
      evasionEnabled: true,
      targetEvasionRate: 0,
      roll: null,
      evaded: false,
    });
    expect(
      resolveEvasionCheck(stream, {
        evasionEnabled: true,
        targetEvasionRate: EVASION_RATE_SCALE,
      }),
    ).toEqual({
      evasionEnabled: true,
      targetEvasionRate: EVASION_RATE_SCALE,
      roll: null,
      evaded: true,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("rejects invalid rates without consuming random values", () => {
    const stream = createCombatStream();
    const initialState = stream.exportState();

    expect(() =>
      resolveEvasionCheck(stream, { evasionEnabled: true, targetEvasionRate: 1.5 }),
    ).toThrow(TypeError);
    expect(() =>
      resolveEvasionCheck(stream, { evasionEnabled: true, targetEvasionRate: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      resolveEvasionCheck(stream, {
        evasionEnabled: true,
        targetEvasionRate: EVASION_RATE_SCALE + 1,
      }),
    ).toThrow(RangeError);
    expect(stream.exportState()).toEqual(initialState);
  });
});
