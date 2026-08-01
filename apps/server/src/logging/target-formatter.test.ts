import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { formatLogTarget, formatPlayerTarget } from "./target-formatter.ts";

describe("formatPlayerTarget", () => {
  it("right-pads names shorter than seven characters", () => {
    expect(formatPlayerTarget("Runze")).toBe("Runze  ");
  });

  it("preserves names that are exactly seven characters", () => {
    expect(formatPlayerTarget("Player1")).toBe("Player1");
  });

  it("abbreviates long names using their first and last three characters", () => {
    expect(formatPlayerTarget("Player001")).toBe("Pla*001");
  });

  it("counts Unicode code points instead of UTF-16 code units", () => {
    expect(formatPlayerTarget("甲乙丙丁戊己庚")).toBe("甲乙丙丁戊己庚");
  });

  it("rejects names that could break the log structure", () => {
    expect(() => formatPlayerTarget("Bad]Name")).toThrow(TypeError);
    expect(() => formatPlayerTarget("Bad\nName")).toThrow(TypeError);
  });
});

describe("formatLogTarget", () => {
  it("uses dashes for logs unrelated to a player", () => {
    expect(formatLogTarget({ kind: "system" })).toBe("-------");
  });

  it("formats the display name without exposing the internal player id", () => {
    expect(
      formatLogTarget({
        kind: "player",
        playerId: "player-1" as PlayerId,
        displayName: "Alice",
      }),
    ).toBe("Alice  ");
  });
});
