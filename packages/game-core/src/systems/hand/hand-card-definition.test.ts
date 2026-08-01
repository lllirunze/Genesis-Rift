import { describe, expect, it } from "vitest";

import {
  validateHandCardDefinition,
  validateHandCardDefinitions,
  type HandCardDefinition,
} from "./hand-card-definition.ts";

const DEFINITION: HandCardDefinition = {
  definitionId: "hand-card.precise-strike",
  name: "Precise Strike",
  description: "Improves one attack before its hit result is resolved.",
  quality: "common",
  type: "combat",
  usage: {
    timing: "response",
    responseTypes: ["attack.before-hit"],
    conditionIds: ["target.is-own-attack"],
    targetTypes: ["attack"],
  },
  effectIds: ["effect.attack.hit-bonus"],
  keywords: ["attack", "hit"],
  destinationAfterResolution: "discard",
};

describe("hand card definition", () => {
  it("accepts a complete hand card definition", () => {
    expect(() => validateHandCardDefinition(DEFINITION)).not.toThrow();
  });

  it("requires response cards to declare a response type", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        usage: { ...DEFINITION.usage, responseTypes: [] },
      }),
    ).toThrow("at least one response type");
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

  it("rejects reserved mythic quality and duplicate keywords", () => {
    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        quality: "mythic",
      } as unknown as HandCardDefinition),
    ).toThrow("Unsupported hand card quality");

    expect(() =>
      validateHandCardDefinition({
        ...DEFINITION,
        keywords: ["attack", "attack"],
      }),
    ).toThrow("Duplicate keywords");
  });

  it("requires globally unique ids and names", () => {
    expect(() =>
      validateHandCardDefinitions([
        DEFINITION,
        { ...DEFINITION, definitionId: "hand-card.precise-strike-copy" },
      ]),
    ).toThrow("Duplicate hand card name");
  });
});
