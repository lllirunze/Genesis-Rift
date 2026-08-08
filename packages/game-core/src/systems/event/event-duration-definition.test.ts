import { describe, expect, it } from "vitest";

import {
  validateEventDurationDefinition,
  validateEventDurationRepeatDefinition,
  type EventDurationDefinition,
} from "./event-duration-definition.ts";

describe("event duration definition validation", () => {
  it("accepts an immediate event without runtime duration state", () => {
    expect(() => validateEventDurationDefinition({ type: "IMMEDIATE" })).not.toThrow();
  });

  it("accepts fixed-round and condition-based durations", () => {
    const fixedRounds: EventDurationDefinition = {
      type: "FIXED_ROUNDS",
      rounds: 3,
      updateTiming: "ROUND_END",
      repeat: { policy: "REFRESH" },
    };
    const untilCondition: EventDurationDefinition = {
      type: "UNTIL_CONDITION",
      endCondition: {
        type: "CONDITION",
        conditionId: "world.stateIs",
        parameters: { stateId: "world.curse-cleansed" },
      },
      updateTiming: "ROUND_START",
      repeat: { policy: "REPLACE" },
    };

    expect(() => validateEventDurationDefinition(fixedRounds)).not.toThrow();
    expect(() => validateEventDurationDefinition(untilCondition)).not.toThrow();
  });

  it("accepts world-linked and permanent durations", () => {
    expect(() =>
      validateEventDurationDefinition({
        type: "UNTIL_WORLD_EVENT_END",
        worldEventId: "event_000101",
        repeat: { policy: "IGNORE" },
      }),
    ).not.toThrow();

    expect(() =>
      validateEventDurationDefinition({
        type: "PERMANENT",
        repeat: { policy: "STACK", maximumInstances: 2 },
      }),
    ).not.toThrow();
  });

  it("rejects invalid round counts, update timings, and end conditions", () => {
    expect(() =>
      validateEventDurationDefinition({
        type: "FIXED_ROUNDS",
        rounds: 0,
        updateTiming: "ROUND_END",
        repeat: { policy: "IGNORE" },
      }),
    ).toThrow(RangeError);

    expect(() =>
      validateEventDurationDefinition({
        type: "FIXED_ROUNDS",
        rounds: 1,
        updateTiming: "BATTLE_END" as "ROUND_END",
        repeat: { policy: "IGNORE" },
      }),
    ).toThrow("Unsupported event duration update timing");

    expect(() =>
      validateEventDurationDefinition({
        type: "UNTIL_CONDITION",
        endCondition: {
          type: "GROUP",
          operator: "ALL",
          conditions: [],
        },
        updateTiming: "ROUND_END",
        repeat: { policy: "IGNORE" },
      }),
    ).toThrow("at least one condition");
  });

  it("requires a bounded STACK policy and restricts REFRESH to fixed rounds", () => {
    expect(() =>
      validateEventDurationRepeatDefinition({ policy: "STACK", maximumInstances: 0 }),
    ).toThrow(RangeError);

    expect(() =>
      validateEventDurationDefinition({
        type: "PERMANENT",
        repeat: { policy: "REFRESH" },
      }),
    ).toThrow("cannot use the REFRESH repeat policy");

    expect(() =>
      validateEventDurationDefinition({
        type: "UNTIL_WORLD_EVENT_END",
        worldEventId: "event_000101",
        repeat: { policy: "REFRESH" },
      }),
    ).toThrow("cannot use the REFRESH repeat policy");
  });
});
