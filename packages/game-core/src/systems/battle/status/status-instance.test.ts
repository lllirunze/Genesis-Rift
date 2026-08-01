import { describe, expect, it } from "vitest";

import type { StatusDefinition } from "./status-definition.ts";
import {
  createStatusInstance,
  validateStatusInstance,
  type StatusInstance,
} from "./status-instance.ts";

const DEFINITION: StatusDefinition = {
  definitionId: "status.growing-power",
  name: "Growing Power",
  description: "Provides power that can accumulate over time.",
  kind: "buff",
  tags: ["growth"],
  duration: {
    turns: 20,
  },
  maxStacks: 10,
  removal: {
    dispellable: false,
    removeOnDeath: false,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "strength",
      targetType: "primary",
      targetAttribute: "strength",
      valuePerStack: 1,
    },
  ],
};

describe("status instance", () => {
  it("creates an inactive runtime instance with zero stacks", () => {
    expect(
      createStatusInstance({
        instanceId: "status-instance-1",
        definition: DEFINITION,
        sourceId: "character-veigar",
        targetId: "character-veigar",
        createdAtSequence: 12,
      }),
    ).toEqual({
      instanceId: "status-instance-1",
      definitionId: "status.growing-power",
      sourceId: "character-veigar",
      targetId: "character-veigar",
      currentStacks: 0,
      remainingTurns: 20,
      createdAtSequence: 12,
    });
  });

  it("accepts an active instance within its configured boundaries", () => {
    const instance: StatusInstance = {
      ...createStatusInstance({
        instanceId: "status-instance-1",
        definition: DEFINITION,
        sourceId: "character-a",
        targetId: "character-b",
        createdAtSequence: 0,
      }),
      currentStacks: 4,
      remainingTurns: 8,
    };

    expect(() => validateStatusInstance(instance, DEFINITION)).not.toThrow();
  });

  it("rejects stack counts above the definition maximum", () => {
    const instance: StatusInstance = {
      ...createStatusInstance({
        instanceId: "status-instance-1",
        definition: DEFINITION,
        sourceId: "character-a",
        targetId: "character-b",
        createdAtSequence: 0,
      }),
      currentStacks: 11,
    };

    expect(() => validateStatusInstance(instance, DEFINITION)).toThrow("configured maximum");
  });

  it("rejects mismatched definitions and invalid remaining durations", () => {
    const instance = createStatusInstance({
      instanceId: "status-instance-1",
      definition: DEFINITION,
      sourceId: "character-a",
      targetId: "character-b",
      createdAtSequence: 0,
    });

    expect(() =>
      validateStatusInstance(instance, {
        ...DEFINITION,
        definitionId: "status.other",
      }),
    ).toThrow("definition mismatch");

    expect(() => validateStatusInstance({ ...instance, remainingTurns: 21 }, DEFINITION)).toThrow(
      "configured duration",
    );
  });
});
