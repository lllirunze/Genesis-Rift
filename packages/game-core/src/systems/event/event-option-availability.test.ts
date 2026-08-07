import { describe, expect, it } from "vitest";

import type { EventDefinition } from "./event-definition.ts";
import { evaluateEventOptionAvailability } from "./event-option-availability.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";

const CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: null,
  terrainDefinitionId: null,
  featureIds: new Set(),
  weatherId: null,
  periodId: "day",
  player: {
    level: 3,
    identityId: "identity.test",
    raceId: "race.test",
    faithId: "faith.test",
    isInBattle: false,
    itemQuantities: new Map(),
    equippedDefinitionIds: new Set(),
    resourceValues: new Map([["resource.health", 4]]),
  },
  questStages: new Map(),
  dungeonId: null,
  worldStateIds: new Set(),
  revealedEventIds: new Set(),
  isFirstVisit: true,
};

const CHOICE_DEFINITION: EventDefinition = {
  eventId: "event.test.options",
  name: "Test Options",
  description: "An event used to test option availability.",
  triggerCondition: null,
  category: "common",
  rarity: "common",
  tags: ["test"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "leave",
        name: "Leave",
        description: "Leave the event.",
        availabilityCondition: null,
        effects: [],
      },
      {
        optionId: "endure",
        name: "Endure",
        description: "Continue only with enough health.",
        availabilityCondition: {
          type: "CONDITION",
          conditionId: "resource.atLeast",
          parameters: { resourceId: "resource.health", amount: 5 },
        },
        effects: [],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 100,
  cooldownTurns: 0,
};

describe("event option availability", () => {
  it("evaluates unconditional and conditional options independently", () => {
    expect(evaluateEventOptionAvailability(CHOICE_DEFINITION, CONTEXT)).toEqual([
      { optionId: "leave", isAvailable: true },
      { optionId: "endure", isAvailable: false },
    ]);
  });

  it("rejects direct event definitions", () => {
    expect(() =>
      evaluateEventOptionAvailability(
        {
          ...CHOICE_DEFINITION,
          resolution: {
            type: "DIRECT",
            effects: [
              {
                effectKey: "grantCoin",
                effectId: "coin.modify",
                targetType: "TRIGGER_PLAYER",
                parameters: { amount: 1 },
                failurePolicy: "STOP",
              },
            ],
          },
        },
        CONTEXT,
      ),
    ).toThrow("do not contain player options");
  });
});
