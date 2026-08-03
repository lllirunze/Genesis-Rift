import { describe, expect, it } from "vitest";

import {
  getEventDefinition,
  validateEventDefinition,
  validateEventDefinitionCatalog,
  validateEventDefinitions,
  type EventDefinition,
} from "./event-definition.ts";

const ABANDONED_CAMP_EVENT: EventDefinition = {
  eventId: "event.common.abandoned-camp",
  name: "Abandoned Camp",
  description: "The player discovers an abandoned camp in the wilderness.",
  triggerCondition: null,
  category: "common",
  rarity: "common",
  tags: ["exploration", "wilderness"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  baseWeight: 100,
  cooldownTurns: 2,
};

describe("event definition validation", () => {
  it("accepts a complete forced-reveal event definition", () => {
    expect(() => validateEventDefinition(ABANDONED_CAMP_EVENT)).not.toThrow();
  });

  it("accepts an optional-reveal event definition", () => {
    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        eventId: "event.adventure.ancient-ruins",
        name: "Ancient Ruins",
        category: "adventure",
        rarity: "rare",
        revealMode: "OPTIONAL",
        repeatRule: "oncePerPlayer",
        cooldownTurns: 0,
      }),
    ).not.toThrow();
  });

  it("uses the shared five-level quality system for event rarity", () => {
    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        rarity: "excellent",
      }),
    ).not.toThrow();

    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        rarity: "mythic" as EventDefinition["rarity"],
      }),
    ).toThrow("Unsupported event rarity");
  });

  it("validates the configured trigger condition", () => {
    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        triggerCondition: {
          type: "CONDITION",
          conditionId: "map.regionIs",
          parameters: { regionDefinitionId: "region.wilderness" },
        },
      }),
    ).not.toThrow();

    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        triggerCondition: {
          type: "GROUP",
          operator: "ALL",
          conditions: [],
        },
      }),
    ).toThrow("at least one condition");
  });

  it("rejects unsupported reveal modes and invalid integer configuration", () => {
    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        revealMode: "HIDDEN" as EventDefinition["revealMode"],
      }),
    ).toThrow("Unsupported event reveal mode");

    expect(() => validateEventDefinition({ ...ABANDONED_CAMP_EVENT, baseWeight: 0.5 })).toThrow(
      RangeError,
    );

    expect(() => validateEventDefinition({ ...ABANDONED_CAMP_EVENT, cooldownTurns: -1 })).toThrow(
      RangeError,
    );
  });

  it("rejects duplicate tags and duplicate event ids", () => {
    expect(() =>
      validateEventDefinition({
        ...ABANDONED_CAMP_EVENT,
        tags: ["exploration", "exploration"],
      }),
    ).toThrow("Duplicate tags value");

    expect(() =>
      validateEventDefinitions([
        ABANDONED_CAMP_EVENT,
        { ...ABANDONED_CAMP_EVENT, name: "Another Event" },
      ]),
    ).toThrow("Duplicate event id");
  });

  it("validates catalog keys and reads known definitions", () => {
    const catalog = {
      [ABANDONED_CAMP_EVENT.eventId]: ABANDONED_CAMP_EVENT,
    };

    expect(() => validateEventDefinitionCatalog(catalog)).not.toThrow();
    expect(getEventDefinition(catalog, ABANDONED_CAMP_EVENT.eventId)).toBe(ABANDONED_CAMP_EVENT);
    expect(() => getEventDefinition(catalog, "event.unknown")).toThrow("Unknown event definition");

    expect(() =>
      validateEventDefinitionCatalog({
        "event.common.wrong-key": ABANDONED_CAMP_EVENT,
      }),
    ).toThrow("does not match event id");
  });
});
