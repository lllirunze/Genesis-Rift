import { describe, expect, it } from "vitest";

import { getCubeCoordinateKey } from "./cube-coordinate-key.ts";

describe("cube coordinate keys", () => {
  it("creates a stable key from all three coordinate axes", () => {
    expect(getCubeCoordinateKey({ x: 0, y: 0, z: 0 })).toBe("0,0,0");
    expect(getCubeCoordinateKey({ x: -4, y: 1, z: 3 })).toBe("-4,1,3");
  });

  it("rejects invalid cube coordinates", () => {
    expect(() => getCubeCoordinateKey({ x: 1, y: 1, z: 1 })).toThrow(RangeError);
  });
});
