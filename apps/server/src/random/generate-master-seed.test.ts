import { describe, expect, it } from "vitest";

import { MASTER_SEED_HEX_LENGTH } from "@genesis-rift/game-core";

import { generateMasterSeed } from "./generate-master-seed.ts";

describe("generateMasterSeed", () => {
  it("generates a 256-bit hexadecimal seed from the server secure random source", () => {
    const seed = generateMasterSeed();

    expect(seed).toHaveLength(MASTER_SEED_HEX_LENGTH);
    expect(seed).toMatch(/^[0-9a-f]+$/);
  });
});
