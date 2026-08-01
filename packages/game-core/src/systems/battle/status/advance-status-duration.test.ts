import { describe, expect, it } from "vitest";

import { advanceStatusDurationAtTurnEnd } from "./advance-status-duration.ts";
import { applyStatus } from "./apply-status.ts";
import type { StatusDefinition } from "./status-definition.ts";
import { createStatusInstance } from "./status-instance.ts";

const DEFINITION: StatusDefinition = {
  definitionId: "status.wind-blessing",
  name: "Wind Blessing",
  description: "Temporarily improves movement range.",
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
  effects: [],
};

function createInactiveInstance() {
  return createStatusInstance({
    instanceId: "status-instance-1",
    definition: DEFINITION,
    sourceId: "character-a",
    targetId: "character-b",
    createdAtSequence: 1,
  });
}

describe("advanceStatusDurationAtTurnEnd", () => {
  it("does not advance an inactive zero-stack instance", () => {
    const instance = createInactiveInstance();
    const result = advanceStatusDurationAtTurnEnd(instance, DEFINITION, "character-b");

    expect(result.outcome).toBe("unchanged");
    expect(result.instance).toBe(instance);
  });

  it("does not advance during another target's turn", () => {
    const instance = applyStatus(createInactiveInstance(), DEFINITION).instance;
    const result = advanceStatusDurationAtTurnEnd(instance, DEFINITION, "character-a");

    expect(result.outcome).toBe("unchanged");
    expect(result.instance).toBe(instance);
    expect(result.instance?.remainingTurns).toBe(3);
  });

  it("decreases the remaining duration at the configured timing", () => {
    const instance = applyStatus(createInactiveInstance(), DEFINITION).instance;
    const result = advanceStatusDurationAtTurnEnd(instance, DEFINITION, "character-b");

    expect(result.outcome).toBe("ticked");
    expect(result.previousRemainingTurns).toBe(3);
    expect(result.instance?.remainingTurns).toBe(2);
    expect(instance.remainingTurns).toBe(3);
  });

  it("returns null when the status expires", () => {
    const instance = {
      ...applyStatus(createInactiveInstance(), DEFINITION).instance,
      remainingTurns: 1,
    };
    const result = advanceStatusDurationAtTurnEnd(instance, DEFINITION, "character-b");

    expect(result.outcome).toBe("expired");
    expect(result.previousRemainingTurns).toBe(1);
    expect(result.instance).toBeNull();
  });
});
