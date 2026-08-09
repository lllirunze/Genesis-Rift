import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

import {
  validateHandCardDefinition,
  validateHandCardDefinitions,
  type HandCardDefinition,
} from "./hand-card-definition.ts";

const DEFINITION: HandCardDefinition = {
  cardId: createTestHandCardId(1),
  name: "preciseStrike",
  description: "Reduces the target's evasion before one attack is resolved.",
  quality: "common",
  type: "combat",
  usage: {
    timing: "response",
    responseTypes: ["attack.beforeEvasion"],
    conditionIds: ["source.isOwnAttack"],
    targetTypes: ["action"],
  },
  effects: [
    {
      effectId: "evasion.modify",
      parameters: { amount: 10 },
    },
  ],
  destinationAfterResolution: "discard",
};

describe("hand card definition", () => {
  it("accepts a complete hand card definition with a positive numeric id", () => {
    expect(() => validateHandCardDefinition(DEFINITION)).not.toThrow();
  });

  it("requires an English camelCase card name", () => {
    for (const name of ["精准一击", "PreciseStrike", "precise strike", "precise-strike"]) {
      expect(() => validateHandCardDefinition({ ...DEFINITION, name })).toThrow(
        "name must use camelCase",
      );
    }
  });

  it("requires description to be a complete English sentence", () => {
    for (const description of [
      "降低一次攻击的闪避率。",
      "improves one attack.",
      "Improves one attack",
      " Improves one attack.",
    ]) {
      expect(() => validateHandCardDefinition({ ...DEFINITION, description })).toThrow(
        "description must be a trimmed English sentence",
      );
    }
  });

  it("rejects reserved, malformed, and wrong-prefix card ids", () => {
    for (const cardId of ["card_000000", "card_1", "item_000001"]) {
      expect(() =>
        validateHandCardDefinition({
          ...DEFINITION,
          cardId: cardId as HandCardDefinition["cardId"],
        }),
      ).toThrow();
    }
  });

  it("requires response cards to declare a response type", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, responseTypes: [] },
      }),
    ).toThrow("at least one response type");
  });

  it("requires active cards to keep response types empty", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, timing: "active" },
      }),
    ).toThrow("Active hand cards must not declare response types");
  });

  it("rejects response types outside the shared response type catalog", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: {
          ...DEFINITION.usage,
          responseTypes: ["unknown.beforeResolution"],
        },
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card response type");
  });

  it("allows no extra conditions and treats multiple registered conditions as a valid group", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, conditionIds: [] },
      }),
    ).not.toThrow();

    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: {
          ...DEFINITION.usage,
          conditionIds: ["source.isOwnAttack", "player.isInCombat"],
        },
      }),
    ).not.toThrow();
  });

  it("rejects condition ids outside the shared condition catalog", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: {
          ...DEFINITION.usage,
          conditionIds: ["player.hasEnoughResource"],
        },
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card condition id");
  });

  it("rejects duplicate condition ids", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: {
          ...DEFINITION.usage,
          conditionIds: ["source.isOwnAttack", "source.isOwnAttack"],
        },
      }),
    ).toThrow("Duplicate usage.conditionIds value");
  });

  it("allows no selected target and supports multiple registered target types", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, targetTypes: [] },
      }),
    ).not.toThrow();

    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, targetTypes: ["player", "npc"] },
      }),
    ).not.toThrow();
  });

  it("rejects target types outside the shared target type catalog", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, targetTypes: ["self"] },
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card target type");
  });

  it("rejects duplicate target types", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, targetTypes: ["action", "action"] },
      }),
    ).toThrow("Duplicate usage.targetTypes value");
  });

  it("requires at least one configured effect", () => {
    expect(() => validateHandCardDefinition({ ...DEFINITION, effects: [] })).toThrow(
      "at least one effect",
    );
  });

  it("supports ordered effects with effect-specific parameters", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        effects: [
          { effectId: "health.restore", parameters: { amount: 5 } },
          {
            effectId: "status.add",
            parameters: { statusDefinitionId: "buff_000105", stacks: 1 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects unsupported effect ids", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        effects: [{ effectId: "unknown.execute", parameters: {} }],
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card effect id");
  });

  it("rejects invalid and unexpected effect parameters", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        effects: [{ effectId: "health.restore", parameters: { amount: 1.5 } }],
      } as unknown as HandCardDefinition),
    ).toThrow("must be a positive safe integer");

    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        effects: [
          {
            effectId: "health.restore",
            parameters: { amount: 5, durationTurns: 2 },
          },
        ],
      } as unknown as HandCardDefinition),
    ).toThrow("parameters must contain exactly");
  });

  it("rejects the ambiguous special usage timing", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, timing: "special" },
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card usage timing");
  });

  it("allows legendary quality in any functional hand card type", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        quality: "legendary",
      }),
    ).not.toThrow();

    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        type: "unsupported",
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card type");
  });

  it("rejects reserved mythic quality", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        quality: "mythic",
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card quality");
  });

  it("rejects destinations outside discard and hand", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        destinationAfterResolution: "drawPileTop",
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card destination");
  });

  it("allows identical card content when global card ids differ", () => {
    expect(() =>
      validateHandCardDefinitions([DEFINITION, { ...DEFINITION, cardId: createTestHandCardId(2) }]),
    ).not.toThrow();
  });

  it("rejects different content that uses the same English name", () => {
    expect(() =>
      validateHandCardDefinitions([
        DEFINITION,
        {
          ...DEFINITION,
          cardId: createTestHandCardId(2),
          description: "Uses the same name for a different effect.",
        },
      ]),
    ).toThrow("same name must have identical content");
  });

  it("treats different effect parameters as different content for the same name", () => {
    expect(() =>
      validateHandCardDefinitions([
        DEFINITION,
        {
          ...DEFINITION,
          cardId: createTestHandCardId(2),
          effects: [{ effectId: "evasion.modify", parameters: { amount: -20 } }],
        },
      ]),
    ).toThrow("same name must have identical content");
  });

  it("rejects duplicate global card ids", () => {
    expect(() => validateHandCardDefinitions([DEFINITION, { ...DEFINITION }])).toThrow(
      "Duplicate hand card id",
    );
  });
});
