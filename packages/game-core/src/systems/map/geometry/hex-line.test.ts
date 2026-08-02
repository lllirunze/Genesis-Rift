import { describe, expect, it } from "vitest";

import { getHexLineBranches } from "./hex-line.ts";

describe("hex line branches", () => {
  it("returns one straight branch for a target on a principal direction", () => {
    expect(getHexLineBranches({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: -3 })).toEqual([
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: -1 },
        { x: 0, y: 2, z: -2 },
        { x: 0, y: 3, z: -3 },
      ],
    ]);
  });

  it("returns both valid branches when a line crosses a hexagonal edge", () => {
    expect(getHexLineBranches({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: -2 })).toEqual([
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: -1 },
        { x: 1, y: 1, z: -2 },
      ],
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: -1 },
        { x: 1, y: 1, z: -2 },
      ],
    ]);
  });

  it("returns the origin once when both coordinates are equal", () => {
    expect(getHexLineBranches({ x: 2, y: -1, z: -1 }, { x: 2, y: -1, z: -1 })).toEqual([
      [{ x: 2, y: -1, z: -1 }],
    ]);
  });
});
