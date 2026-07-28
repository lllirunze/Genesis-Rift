import { describe, expect, it } from "vitest";

import { createMasterSeed } from "./random-seed.ts";
import { deriveRandomStreamSeed } from "./seed-deriver.ts";

const MASTER_SEED = createMasterSeed(
  "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F",
);

describe("random seeds", () => {
  it("validates and normalizes a 256-bit master seed", () => {
    expect(MASTER_SEED).toBe("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    expect(() => createMasterSeed("too-short")).toThrow(TypeError);
  });

  it("derives stable stream seeds from type and scope identity", () => {
    expect(
      deriveRandomStreamSeed({
        masterSeed: MASTER_SEED,
        streamType: "weather",
      }),
    ).toBe("a7d557e308032f40");
    expect(
      deriveRandomStreamSeed({
        masterSeed: MASTER_SEED,
        streamType: "combat",
        scopeId: "battle-1",
      }),
    ).toBe("94b286658417de49");
    expect(
      deriveRandomStreamSeed({
        masterSeed: MASTER_SEED,
        streamType: "combat",
        scopeId: "battle-2",
      }),
    ).toBe("94b5ec65841ac172");
  });

  it("rejects an explicitly empty scope id", () => {
    expect(() =>
      deriveRandomStreamSeed({
        masterSeed: MASTER_SEED,
        streamType: "combat",
        scopeId: "",
      }),
    ).toThrow(TypeError);
  });
});
