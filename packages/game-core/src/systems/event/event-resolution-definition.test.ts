import { describe, expect, it } from "vitest";

import {
  validateEventResolutionDefinition,
  type EventResolutionDefinition,
} from "./event-resolution-definition.ts";

const DIRECT_RESOLUTION: EventResolutionDefinition = {
  type: "DIRECT",
  effects: [
    {
      effectKey: "grantCoin",
      effectId: "coin.modify",
      targetType: "TRIGGER_PLAYER",
      parameters: { amount: 3 },
      failurePolicy: "STOP",
    },
  ],
};

describe("event resolution definition validation", () => {
  it("accepts a direct event with at least one effect", () => {
    expect(() => validateEventResolutionDefinition(DIRECT_RESOLUTION)).not.toThrow();
  });

  it("accepts a choice event with conditions and distinct options", () => {
    expect(() =>
      validateEventResolutionDefinition({
        type: "CHOICE",
        options: [
          {
            optionId: "pay",
            name: "Pay",
            description: "Pay coins to continue.",
            availabilityCondition: {
              type: "CONDITION",
              conditionId: "inventory.hasItem",
              parameters: {
                itemDefinitionId: "currency.coin",
                quantity: 3,
              },
            },
            effects: [
              {
                effectKey: "payCoin",
                effectId: "coin.modify",
                targetType: "TRIGGER_PLAYER",
                parameters: { amount: -3 },
                failurePolicy: "STOP",
              },
            ],
          },
          {
            optionId: "leave",
            name: "Leave",
            description: "Leave without taking action.",
            availabilityCondition: null,
            effects: [],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects empty direct effects and choice events with fewer than two options", () => {
    expect(() => validateEventResolutionDefinition({ type: "DIRECT", effects: [] })).toThrow(
      "Direct events must contain at least one effect",
    );

    expect(() =>
      validateEventResolutionDefinition({
        type: "CHOICE",
        options: [
          {
            optionId: "only",
            name: "Only Option",
            description: "The only available option.",
            availabilityCondition: null,
            effects: DIRECT_RESOLUTION.effects,
          },
        ],
      }),
    ).toThrow("at least two options");
  });

  it("rejects duplicate option ids", () => {
    const option = {
      optionId: "same",
      name: "Same Option",
      description: "An option with a duplicate id.",
      availabilityCondition: null,
      effects: DIRECT_RESOLUTION.effects,
    } as const;

    expect(() =>
      validateEventResolutionDefinition({
        type: "CHOICE",
        options: [option, option],
      }),
    ).toThrow("Duplicate event option id");
  });
});
