import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../core/random-seed.ts";
import { RandomStream } from "../core/random-stream.ts";
import { rollD6, rollD20 } from "./dice.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

function createDiceStream(): RandomStream {
  return RandomStream.create("reincarnation", null, STREAM_SEED);
}

describe("dice random utilities", () => {
  it("produces stable D6 and D20 sequences for a fixed stream seed", () => {
    const d6Stream = createDiceStream();
    const d20Stream = createDiceStream();

    expect(Array.from({ length: 8 }, () => rollD6(d6Stream))).toEqual([6, 2, 1, 4, 6, 3, 1, 6]);
    expect(Array.from({ length: 8 }, () => rollD20(d20Stream))).toEqual([
      12, 16, 11, 16, 10, 17, 9, 16,
    ]);
  });

  it("always returns integers inside each die range", () => {
    const stream = createDiceStream();

    for (let index = 0; index < 1_000; index += 1) {
      const d6 = rollD6(stream);
      const d20 = rollD20(stream);

      expect(Number.isInteger(d6)).toBe(true);
      expect(d6).toBeGreaterThanOrEqual(1);
      expect(d6).toBeLessThanOrEqual(6);
      expect(Number.isInteger(d20)).toBe(true);
      expect(d20).toBeGreaterThanOrEqual(1);
      expect(d20).toBeLessThanOrEqual(20);
    }
  });

  it("advances the random stream once per die roll", () => {
    const stream = createDiceStream();

    rollD6(stream);
    rollD20(stream);

    expect(stream.exportState().callCount).toBe(2);
  });
});
