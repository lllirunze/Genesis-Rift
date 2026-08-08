import { describe, expect, it } from "vitest";

import { applyStatus } from "./apply-status.ts";
import { removeStatusStacks } from "./remove-status-stacks.ts";
import { PERMANENT_STATUS_DURATION_TURNS } from "./status-config.ts";
import type { StatusDefinition } from "./status-definition.ts";
import { createStatusInstance } from "./status-instance.ts";

const DEFINITION: StatusDefinition = {
  definitionId: "buff_000102",
  name: "Growing Power",
  description: "Accumulates power when its trigger condition is met.",
  kind: "buff",
  tags: ["growth"],
  duration: { turns: PERMANENT_STATUS_DURATION_TURNS },
  maxStacks: 10,
  removal: {
    dispellable: false,
    removeOnDeath: false,
  },
  effects: [],
};

/**
 * 方法名：createInstanceWithStacks
 * 作用：创建并校验该方法所负责的业务对象。
 * @param stacks 方法所需的 stacks 参数。
 * @returns 本次处理得到的结果。
 */
function createInstanceWithStacks(stacks: number) {
  let instance = createStatusInstance({
    instanceId: "status-instance-1",
    definition: DEFINITION,
    sourceId: "character-a",
    targetId: "character-a",
    createdAtSequence: 1,
  });

  for (let current = 0; current < stacks; current += 1) {
    instance = applyStatus(instance, DEFINITION).instance;
  }

  return instance;
}

describe("removeStatusStacks", () => {
  it("does not alter an inactive zero-stack instance", () => {
    const instance = createInstanceWithStacks(0);
    const result = removeStatusStacks(instance, DEFINITION, 1);

    expect(result.outcome).toBe("unchanged");
    expect(result.instance).toBe(instance);
    expect(result.removedStacks).toBe(0);
  });

  it("removes only the requested number of stacks", () => {
    const instance = createInstanceWithStacks(4);
    const result = removeStatusStacks(instance, DEFINITION, 2);

    expect(result.outcome).toBe("reduced");
    expect(result.previousStacks).toBe(4);
    expect(result.removedStacks).toBe(2);
    expect(result.instance?.currentStacks).toBe(2);
    expect(result.instance?.remainingTurns).toBe(instance.remainingTurns);
  });

  it("removes the whole status when its stack count reaches zero", () => {
    const result = removeStatusStacks(createInstanceWithStacks(2), DEFINITION, 5);

    expect(result.outcome).toBe("removed");
    expect(result.removedStacks).toBe(2);
    expect(result.instance).toBeNull();
  });

  it("requires a positive integer amount", () => {
    expect(() => removeStatusStacks(createInstanceWithStacks(1), DEFINITION, 0)).toThrow(
      "positive safe integer",
    );
  });
});
