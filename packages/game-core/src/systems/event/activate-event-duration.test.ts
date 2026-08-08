import { describe, expect, it } from "vitest";

import { activateEventDuration } from "./activate-event-duration.ts";
import type { EventDefinition } from "./event-definition.ts";
import type { EventDurationDefinition } from "./event-duration-definition.ts";
import type { ResolvedEventInstance } from "./event-instance.ts";

/**
 * 方法名：createDefinition
 * 作用：创建使用指定持续规则的测试事件定义。
 * @param duration 本次测试需要使用的持续规则。
 * @returns 可用于持续事件激活测试的事件定义。
 */
function createDefinition(duration: EventDurationDefinition): EventDefinition {
  return {
    eventId: "event_000108",
    name: "Duration Test",
    description: "An event used to test duration activation.",
    triggerCondition: null,
    category: "world",
    rarity: "common",
    tags: ["test"],
    revealMode: "FORCED",
    repeatRule: "repeatable",
    resolution: {
      type: "DIRECT",
      effects: [
        {
          effectKey: "changeWeather",
          effectId: "weather.change",
          targetType: "WORLD",
          parameters: { weatherId: "weather_000101" },
          failurePolicy: "STOP",
        },
      ],
    },
    duration,
    baseWeight: 100,
    cooldownTurns: 0,
  };
}

/**
 * 方法名：createResolvedEvent
 * 作用：创建具有唯一实例标识的已结算测试事件。
 * @param instanceId 事件实例标识。
 * @returns 可用于激活持续规则的已结算事件实例。
 */
function createResolvedEvent(instanceId: string): ResolvedEventInstance {
  return {
    instanceId,
    eventId: "event_000108",
    triggeringPlayerId: "player-1",
    sourcePoolIds: ["event-pool.test"],
    triggeredAtTurn: 1,
    revealedAtTurn: 1,
    resolvingAtTurn: 1,
    resolvedAtTurn: 1,
    selectedOptionId: null,
    effectResults: [],
    status: "RESOLVED",
  };
}

describe("event duration activation", () => {
  it("does not create runtime state for immediate events", () => {
    const result = activateEventDuration(
      [],
      createResolvedEvent("event-instance-1"),
      createDefinition({ type: "IMMEDIATE" }),
      { durationInstanceId: "duration-1", activatedAtTurn: 1, activatedAtSequence: 1 },
    );

    expect(result).toMatchObject({ outcome: "IMMEDIATE", activeInstances: [] });
  });

  it("ignores or refreshes repeated fixed-round durations according to configuration", () => {
    const ignoreDefinition = createDefinition({
      type: "FIXED_ROUNDS",
      rounds: 3,
      updateTiming: "ROUND_END",
      repeat: { policy: "IGNORE" },
    });
    const first = activateEventDuration(
      [],
      createResolvedEvent("event-instance-1"),
      ignoreDefinition,
      { durationInstanceId: "duration-1", activatedAtTurn: 1, activatedAtSequence: 1 },
    );
    const ignored = activateEventDuration(
      first.activeInstances,
      createResolvedEvent("event-instance-2"),
      ignoreDefinition,
      { durationInstanceId: "duration-2", activatedAtTurn: 2, activatedAtSequence: 2 },
    );

    expect(ignored.outcome).toBe("IGNORED");
    expect(ignored.activeInstances).toEqual(first.activeInstances);

    const refreshDefinition = createDefinition({
      type: "FIXED_ROUNDS",
      rounds: 5,
      updateTiming: "ROUND_END",
      repeat: { policy: "REFRESH" },
    });
    const refreshed = activateEventDuration(
      first.activeInstances,
      createResolvedEvent("event-instance-3"),
      refreshDefinition,
      { durationInstanceId: "duration-3", activatedAtTurn: 2, activatedAtSequence: 2 },
    );

    expect(refreshed).toMatchObject({
      outcome: "REFRESHED",
      activatedInstance: {
        durationInstanceId: "duration-1",
        latestSourceEventInstanceId: "event-instance-3",
        remainingRounds: 5,
      },
    });
  });

  it("replaces old instances and emits cleanup instructions", () => {
    const definition = createDefinition({
      type: "PERMANENT",
      repeat: { policy: "REPLACE" },
    });
    const first = activateEventDuration([], createResolvedEvent("event-instance-1"), definition, {
      durationInstanceId: "duration-1",
      activatedAtTurn: 1,
      activatedAtSequence: 1,
    });
    const replaced = activateEventDuration(
      first.activeInstances,
      createResolvedEvent("event-instance-2"),
      definition,
      { durationInstanceId: "duration-2", activatedAtTurn: 2, activatedAtSequence: 2 },
    );

    expect(replaced).toMatchObject({
      outcome: "REPLACED",
      activeInstances: [{ durationInstanceId: "duration-2" }],
      endedInstances: [{ durationInstanceId: "duration-1", reason: "REPLACED" }],
      endInstructions: [{ durationInstanceId: "duration-1", reason: "REPLACED" }],
    });
  });

  it("allows stacking only up to the configured instance limit", () => {
    const definition = createDefinition({
      type: "PERMANENT",
      repeat: { policy: "STACK", maximumInstances: 2 },
    });
    const first = activateEventDuration([], createResolvedEvent("event-instance-1"), definition, {
      durationInstanceId: "duration-1",
      activatedAtTurn: 1,
      activatedAtSequence: 1,
    });
    const second = activateEventDuration(
      first.activeInstances,
      createResolvedEvent("event-instance-2"),
      definition,
      { durationInstanceId: "duration-2", activatedAtTurn: 2, activatedAtSequence: 2 },
    );
    const limited = activateEventDuration(
      second.activeInstances,
      createResolvedEvent("event-instance-3"),
      definition,
      { durationInstanceId: "duration-3", activatedAtTurn: 3, activatedAtSequence: 3 },
    );

    expect(second.activeInstances).toHaveLength(2);
    expect(limited.outcome).toBe("STACK_LIMIT_REACHED");
    expect(limited.activeInstances).toHaveLength(2);
  });
});
