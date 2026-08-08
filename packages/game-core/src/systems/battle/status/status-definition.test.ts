import { describe, expect, it } from "vitest";

import {
  validateStatusDefinition,
  validateStatusDefinitions,
  type StatusDefinition,
} from "./status-definition.ts";
import { PERMANENT_STATUS_DURATION_TURNS } from "./status-config.ts";

const STATUS_DEFINITION: StatusDefinition = {
  definitionId: "buff_000002",
  name: "Wind Blessing",
  description: "Temporarily improves the target's movement range.",
  kind: "buff",
  tags: ["blessing", "movement"],
  duration: {
    turns: 3,
  },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      valuePerStack: 1,
    },
  ],
};

describe("status definition validation", () => {
  it("accepts a complete status definition", () => {
    expect(() => validateStatusDefinition(STATUS_DEFINITION)).not.toThrow();
  });

  it("supports stackable and long-lived statuses without extra strategies", () => {
    expect(() =>
      validateStatusDefinition({
        ...STATUS_DEFINITION,
        duration: { turns: PERMANENT_STATUS_DURATION_TURNS },
        maxStacks: 100,
      }),
    ).not.toThrow();
  });

  it("provides one shared duration value for permanent statuses", () => {
    expect(PERMANENT_STATUS_DURATION_TURNS).toBe(999_999);
  });

  it("rejects invalid durations and maximum stack counts", () => {
    expect(() =>
      validateStatusDefinition({
        ...STATUS_DEFINITION,
        duration: { turns: 0 },
      }),
    ).toThrow("duration.turns");

    expect(() =>
      validateStatusDefinition({
        ...STATUS_DEFINITION,
        maxStacks: 0,
      }),
    ).toThrow("maxStacks");
  });

  it("rejects duplicate tags and effect ids", () => {
    expect(() =>
      validateStatusDefinition({ ...STATUS_DEFINITION, tags: ["movement", "movement"] }),
    ).toThrow("Duplicate tags");

    expect(() =>
      validateStatusDefinition({
        ...STATUS_DEFINITION,
        effects: [STATUS_DEFINITION.effects[0]!, STATUS_DEFINITION.effects[0]!],
      }),
    ).toThrow("Duplicate status effect id");
  });

  it("requires globally unique definition ids and names", () => {
    expect(() =>
      validateStatusDefinitions([
        STATUS_DEFINITION,
        { ...STATUS_DEFINITION, definitionId: "buff_000003" },
      ]),
    ).toThrow("Duplicate status name");
  });
});
