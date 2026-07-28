import { describe, expect, it } from "vitest";

import { shouldDrawScheduledWeather } from "./weather-schedule.ts";

describe("shouldDrawScheduledWeather", () => {
  it("draws on odd rounds and pauses while a major disaster is active", () => {
    expect(shouldDrawScheduledWeather(1, false)).toBe(true);
    expect(shouldDrawScheduledWeather(2, false)).toBe(false);
    expect(shouldDrawScheduledWeather(3, false)).toBe(true);
    expect(shouldDrawScheduledWeather(3, true)).toBe(false);
  });

  it("rejects invalid round numbers", () => {
    expect(() => shouldDrawScheduledWeather(0, false)).toThrow(RangeError);
    expect(() => shouldDrawScheduledWeather(1.5, false)).toThrow(RangeError);
  });
});
