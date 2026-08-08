import { describe, expect, it } from "vitest";

import { getDayNightState } from "./day-night.ts";

describe("day and night state", () => {
  it("alternates every five complete rounds without depending on weather", () => {
    expect(getDayNightState(1)).toEqual({
      periodId: "day",
      elapsedRounds: 1,
      remainingRounds: 4,
      phaseIndex: 0,
    });
    expect(getDayNightState(5)).toMatchObject({ periodId: "day", remainingRounds: 0 });
    expect(getDayNightState(6)).toMatchObject({ periodId: "night", elapsedRounds: 1 });
    expect(getDayNightState(11)).toMatchObject({ periodId: "day", phaseIndex: 2 });
  });
});
