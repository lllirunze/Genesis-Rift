import { describe, expect, it } from "vitest";

import {
  validateEventConditionExpression,
  type EventConditionExpression,
} from "./event-condition-definition.ts";

describe("event condition definition validation", () => {
  it("accepts a type-safe atomic condition", () => {
    expect(() =>
      validateEventConditionExpression({
        type: "CONDITION",
        conditionId: "player.levelAtLeast",
        parameters: { level: 5 },
      }),
    ).not.toThrow();
  });

  it("accepts nested ALL and ANY condition groups", () => {
    const expression: EventConditionExpression = {
      type: "GROUP",
      operator: "ALL",
      conditions: [
        {
          type: "CONDITION",
          conditionId: "map.regionIs",
          parameters: { regionDefinitionId: "region_000001" },
        },
        {
          type: "GROUP",
          operator: "ANY",
          conditions: [
            {
              type: "CONDITION",
              conditionId: "time.is",
              parameters: { periodId: "night" },
            },
            {
              type: "CONDITION",
              conditionId: "weather.is",
              parameters: { weatherId: "weather_000001" },
            },
          ],
        },
      ],
    };

    expect(() => validateEventConditionExpression(expression)).not.toThrow();
  });

  it("rejects empty groups and unsupported operators", () => {
    expect(() =>
      validateEventConditionExpression({
        type: "GROUP",
        operator: "ALL",
        conditions: [],
      }),
    ).toThrow("at least one condition");

    expect(() =>
      validateEventConditionExpression({
        type: "GROUP",
        operator: "NONE" as "ALL",
        conditions: [
          {
            type: "CONDITION",
            conditionId: "time.is",
            parameters: { periodId: "day" },
          },
        ],
      }),
    ).toThrow("Unsupported event condition group operator");
  });

  it("rejects unsupported condition ids and incorrect parameters", () => {
    expect(() =>
      validateEventConditionExpression({
        type: "CONDITION",
        conditionId: "player.unknown" as "player.levelAtLeast",
        parameters: { level: 1 },
      }),
    ).toThrow("Unsupported event condition id");

    expect(() =>
      validateEventConditionExpression({
        type: "CONDITION",
        conditionId: "inventory.hasItem",
        parameters: {
          itemDefinitionId: "item_000003",
          quantity: 0,
        },
      }),
    ).toThrow(RangeError);

    expect(() =>
      validateEventConditionExpression({
        type: "CONDITION",
        conditionId: "weather.is",
        parameters: {
          weatherId: "weather_000003",
          extra: true,
        } as { weatherId: string },
      }),
    ).toThrow("must contain exactly");
  });

  it("rejects circular condition groups", () => {
    const conditions: EventConditionExpression[] = [];
    const group: EventConditionExpression = {
      type: "GROUP",
      operator: "ALL",
      conditions,
    };
    conditions.push(group);

    expect(() => validateEventConditionExpression(group)).toThrow("circular references");
  });
});
