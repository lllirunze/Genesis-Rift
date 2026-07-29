import { describe, expect, it } from "vitest";

import { isQuality, QUALITY_COLORS, QUALITY_LEVELS } from "./quality.ts";

describe("quality", () => {
  it("defines the shared five quality levels in ascending order", () => {
    expect(QUALITY_LEVELS).toEqual(["common", "excellent", "rare", "epic", "legendary"]);
  });

  it("provides one display color for every quality", () => {
    expect(QUALITY_COLORS).toEqual({
      common: "#9CA3AF",
      excellent: "#22C55E",
      rare: "#3B82F6",
      epic: "#A855F7",
      legendary: "#F97316",
    });
  });

  it("recognizes only supported shared qualities", () => {
    expect(isQuality("rare")).toBe(true);
    expect(isQuality("mythic")).toBe(false);
    expect(isQuality(null)).toBe(false);
  });
});
