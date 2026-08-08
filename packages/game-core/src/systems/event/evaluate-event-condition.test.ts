import { describe, expect, it } from "vitest";

import {
  evaluateEventConditionExpression,
  type EventConditionEvaluationContext,
} from "./evaluate-event-condition.ts";

const CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: "region_000001",
  terrainDefinitionId: "terrain_000002",
  featureIds: new Set(["map-feature.ancient-ruins"]),
  weatherId: "weather_000001",
  periodId: "night",
  player: {
    level: 5,
    identityId: "identity.ranger",
    raceId: "race.human",
    faithId: "faith.god",
    isInBattle: false,
    itemQuantities: new Map([
      ["currency.coin", 5],
      ["item_000010", 1],
    ]),
    equippedDefinitionIds: new Set(["equip_000003"]),
    resourceValues: new Map([
      ["health", 30],
      ["mana", 10],
    ]),
  },
  questStages: new Map([["quest.village-help", "accepted"]]),
  dungeonId: null,
  worldStateIds: new Set(["world.rift-open"]),
  revealedEventIds: new Set(["event_000001"]),
  isFirstVisit: true,
};

describe("event condition evaluation", () => {
  it("evaluates map, environment, and exploration facts", () => {
    expect(
      evaluateEventConditionExpression(
        {
          type: "GROUP",
          operator: "ALL",
          conditions: [
            {
              type: "CONDITION",
              conditionId: "map.regionIs",
              parameters: { regionDefinitionId: "region_000001" },
            },
            {
              type: "CONDITION",
              conditionId: "weather.is",
              parameters: { weatherId: "weather_000001" },
            },
            {
              type: "CONDITION",
              conditionId: "exploration.isFirstVisit",
              parameters: {},
            },
          ],
        },
        CONTEXT,
      ),
    ).toBe(true);
  });

  it("evaluates player inventory, equipment, resources, and battle state", () => {
    expect(
      evaluateEventConditionExpression(
        {
          type: "GROUP",
          operator: "ALL",
          conditions: [
            {
              type: "CONDITION",
              conditionId: "player.isNotInBattle",
              parameters: {},
            },
            {
              type: "CONDITION",
              conditionId: "inventory.hasItem",
              parameters: { itemDefinitionId: "currency.coin", quantity: 5 },
            },
            {
              type: "CONDITION",
              conditionId: "equipment.has",
              parameters: { equipmentDefinitionId: "equip_000003" },
            },
            {
              type: "CONDITION",
              conditionId: "resource.atLeast",
              parameters: { resourceId: "health", amount: 30 },
            },
          ],
        },
        CONTEXT,
      ),
    ).toBe(true);
  });

  it("evaluates ANY groups and revealed event history", () => {
    expect(
      evaluateEventConditionExpression(
        {
          type: "GROUP",
          operator: "ANY",
          conditions: [
            {
              type: "CONDITION",
              conditionId: "event.wasNotRevealed",
              parameters: { eventId: "event_000001" },
            },
            {
              type: "CONDITION",
              conditionId: "world.stateIs",
              parameters: { stateId: "world.rift-open" },
            },
          ],
        },
        CONTEXT,
      ),
    ).toBe(true);
  });

  it("treats player-dependent conditions as false without a triggering player", () => {
    expect(
      evaluateEventConditionExpression(
        {
          type: "CONDITION",
          conditionId: "player.levelAtLeast",
          parameters: { level: 1 },
        },
        { ...CONTEXT, player: null },
      ),
    ).toBe(false);
  });
});
