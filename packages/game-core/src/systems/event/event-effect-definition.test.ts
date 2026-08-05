import { describe, expect, it } from "vitest";

import {
  validateEventEffectDefinition,
  validateEventEffectDefinitions,
  type EventEffectDefinition,
} from "./event-effect-definition.ts";

const RESTORE_HEALTH_EFFECT: EventEffectDefinition = {
  effectKey: "restoreHealth",
  effectId: "characterResource.modify",
  targetType: "TRIGGER_PLAYER",
  parameters: {
    resourceId: "health",
    amount: 10,
  },
  failurePolicy: "CONTINUE",
};

describe("event effect definition validation", () => {
  it("accepts a valid standard event effect", () => {
    expect(() => validateEventEffectDefinition(RESTORE_HEALTH_EFFECT)).not.toThrow();
  });

  it("accepts positive and negative integer resource changes", () => {
    expect(() =>
      validateEventEffectDefinition({
        ...RESTORE_HEALTH_EFFECT,
        parameters: { resourceId: "health", amount: -5 },
      }),
    ).not.toThrow();
  });

  it("rejects targets that are incompatible with an effect", () => {
    expect(() =>
      validateEventEffectDefinition({
        ...RESTORE_HEALTH_EFFECT,
        targetType: "WORLD" as "TRIGGER_PLAYER",
      }),
    ).toThrow("does not support target type");
  });

  it("rejects incorrect parameters and duplicate effect keys", () => {
    expect(() =>
      validateEventEffectDefinition({
        ...RESTORE_HEALTH_EFFECT,
        parameters: { resourceId: "health", amount: 0 },
      }),
    ).toThrow(RangeError);

    expect(() =>
      validateEventEffectDefinitions([
        RESTORE_HEALTH_EFFECT,
        {
          ...RESTORE_HEALTH_EFFECT,
          parameters: { resourceId: "mana", amount: 5 },
        },
      ]),
    ).toThrow("Duplicate event effect key");
  });
});
