import { describe, expect, it } from "vitest";

import {
  isQuality,
  isReservedQuality,
  isStandardQuality,
  QUALITY_COLORS,
  QUALITY_LEVELS,
  RESERVED_QUALITY_LEVELS,
  STANDARD_QUALITY_LEVELS,
} from "./quality.ts";

describe("quality", () => {
  it("separates the five active quality levels from reserved future levels", () => {
    expect(STANDARD_QUALITY_LEVELS).toEqual(["common", "excellent", "rare", "epic", "legendary"]);
    expect(RESERVED_QUALITY_LEVELS).toEqual(["mythic"]);
    expect(QUALITY_LEVELS).toEqual(["common", "excellent", "rare", "epic", "legendary", "mythic"]);
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

  it("recognizes mythic as reserved but not currently usable", () => {
    expect(isQuality("rare")).toBe(true);
    expect(isQuality("mythic")).toBe(true);
    expect(isStandardQuality("mythic")).toBe(false);
    expect(isReservedQuality("mythic")).toBe(true);
    expect(isQuality(null)).toBe(false);
  });
});
