import { describe, expect, it } from "vitest";

import type { StatusDefinition } from "./status-definition.ts";
import { createStatusInstance } from "./status-instance.ts";
import { applyStatus } from "./apply-status.ts";

/**
 * 方法名：createDefinition
 * 作用：创建并校验该方法所负责的业务对象。
 * @param maxStacks 方法所需的 maxStacks 参数。
 * @returns 本次处理得到的结果。
 */
function createDefinition(maxStacks: number): StatusDefinition {
  return {
    definitionId: "status.focus",
    name: "Focus",
    description: "Temporarily improves insight.",
    kind: "buff",
    tags: ["mental"],
    duration: {
      turns: 3,
    },
    maxStacks,
    removal: {
      dispellable: true,
      removeOnDeath: true,
    },
    effects: [
      {
        effectType: "attribute_modifier",
        effectId: "insight",
        targetType: "primary",
        targetAttribute: "insight",
        valuePerStack: 1,
      },
    ],
  };
}

/**
 * 方法名：createInstance
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definition 方法所需的 definition 参数。
 * @returns 本次处理得到的结果。
 */
function createInstance(definition: StatusDefinition) {
  return createStatusInstance({
    instanceId: "status-instance-1",
    definition,
    sourceId: "character-a",
    targetId: "character-b",
    createdAtSequence: 1,
  });
}

describe("applyStatus", () => {
  it("activates a new instance from zero to one stack", () => {
    const definition = createDefinition(1);
    const result = applyStatus(createInstance(definition), definition);

    expect(result.outcome).toBe("applied");
    expect(result.previousStacks).toBe(0);
    expect(result.addedStacks).toBe(1);
    expect(result.instance.currentStacks).toBe(1);
    expect(result.instance.remainingTurns).toBe(3);
  });

  it("keeps a regular buff at one stack and refreshes its duration", () => {
    const definition = createDefinition(1);
    const activeInstance = {
      ...applyStatus(createInstance(definition), definition).instance,
      remainingTurns: 1,
    };
    const result = applyStatus(activeInstance, definition);

    expect(result.outcome).toBe("refreshed");
    expect(result.addedStacks).toBe(0);
    expect(result.instance.currentStacks).toBe(1);
    expect(result.instance.remainingTurns).toBe(3);
  });

  it("adds one stack at a time until reaching the configured maximum", () => {
    const definition = createDefinition(3);
    const first = applyStatus(createInstance(definition), definition);
    const second = applyStatus(first.instance, definition);
    const third = applyStatus(second.instance, definition);
    const capped = applyStatus({ ...third.instance, remainingTurns: 1 }, definition);

    expect(second.outcome).toBe("stacked");
    expect(second.instance.currentStacks).toBe(2);
    expect(third.instance.currentStacks).toBe(3);
    expect(capped.outcome).toBe("refreshed");
    expect(capped.instance.currentStacks).toBe(3);
    expect(capped.instance.remainingTurns).toBe(3);
  });

  it("does not mutate the existing instance", () => {
    const definition = createDefinition(1);
    const instance = createInstance(definition);

    applyStatus(instance, definition);

    expect(instance.currentStacks).toBe(0);
  });
});
