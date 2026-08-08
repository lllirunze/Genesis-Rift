import { describe, expect, it, vi } from "vitest";

import { advanceEventDurations } from "./advance-event-durations.ts";
import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import type { ActiveEventDurationInstance } from "./event-duration-instance.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";

const CONDITION_CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: null,
  terrainDefinitionId: null,
  featureIds: new Set(),
  weatherId: null,
  periodId: "day",
  player: null,
  questStages: new Map(),
  dungeonId: null,
  worldStateIds: new Set(["world.condition-complete"]),
  revealedEventIds: new Set(),
  isFirstVisit: false,
};

/**
 * 方法名：createDefinition
 * 作用：创建仅替换持续规则与事件标识的测试事件定义。
 * @param eventId 事件静态标识。
 * @param duration 事件持续规则。
 * @returns 可加入测试注册表的事件定义。
 */
function createDefinition(eventId: string, duration: EventDefinition["duration"]): EventDefinition {
  return {
    eventId,
    name: "Duration Test",
    description: "An event used to test duration advancement.",
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
 * 方法名：createInstance
 * 作用：创建指定类型的活动持续事件测试实例。
 * @param eventId 实例对应的事件静态标识。
 * @param durationType 持续实例类型。
 * @param remainingRounds 固定回合实例的剩余回合数。
 * @returns 可用于时间推进的活动持续事件实例。
 */
function createInstance(
  eventId: string,
  durationType: ActiveEventDurationInstance["durationType"],
  remainingRounds?: number,
): ActiveEventDurationInstance {
  const base = {
    durationInstanceId: `duration.${eventId}`,
    eventId,
    sourceEventInstanceId: `instance.${eventId}`,
    latestSourceEventInstanceId: `instance.${eventId}`,
    triggeringPlayerId: "player-1",
    startedAtTurn: 1,
    startedAtSequence: 1,
    lastUpdateSequence: 1,
  };

  if (durationType === "FIXED_ROUNDS") {
    return { ...base, durationType, remainingRounds: remainingRounds ?? 2 };
  }

  return { ...base, durationType };
}

describe("event duration advancement", () => {
  it("decrements fixed rounds only at the configured timing", () => {
    const definition = createDefinition("event_000111", {
      type: "FIXED_ROUNDS",
      rounds: 2,
      updateTiming: "ROUND_END",
      repeat: { policy: "IGNORE" },
    });
    const getConditionContext = vi.fn(() => CONDITION_CONTEXT);
    const skipped = advanceEventDurations(
      [createInstance("event_000111", "FIXED_ROUNDS")],
      {
        [definition.eventId]: definition,
      },
      {
        timing: "ROUND_START",
        currentTurn: 2,
        currentPlayerId: null,
        updateSequence: 2,
        endedWorldEventIds: new Set(),
        getConditionContext,
      },
    );
    const advanced = advanceEventDurations(
      skipped.activeInstances,
      {
        [definition.eventId]: definition,
      },
      {
        timing: "ROUND_END",
        currentTurn: 2,
        currentPlayerId: null,
        updateSequence: 3,
        endedWorldEventIds: new Set(),
        getConditionContext,
      },
    );

    expect(skipped.updatedInstances).toEqual([]);
    expect(advanced.activeInstances[0]).toMatchObject({ remainingRounds: 1 });
    expect(getConditionContext).not.toHaveBeenCalled();
  });

  it("ends fixed, condition-based, and world-linked durations with matching reasons", () => {
    const definitions = {
      event_000111: createDefinition("event_000111", {
        type: "FIXED_ROUNDS",
        rounds: 1,
        updateTiming: "ROUND_END",
        repeat: { policy: "IGNORE" },
      }),
      event_000110: createDefinition("event_000110", {
        type: "UNTIL_CONDITION",
        endCondition: {
          type: "CONDITION",
          conditionId: "world.stateIs",
          parameters: { stateId: "world.condition-complete" },
        },
        updateTiming: "ROUND_END",
        repeat: { policy: "IGNORE" },
      }),
      event_000114: createDefinition("event_000114", {
        type: "UNTIL_WORLD_EVENT_END",
        worldEventId: "event_000115",
        repeat: { policy: "IGNORE" },
      }),
      event_000112: createDefinition("event_000112", {
        type: "PERMANENT",
        repeat: { policy: "IGNORE" },
      }),
    } satisfies EventDefinitionCatalog;
    const result = advanceEventDurations(
      [
        createInstance("event_000111", "FIXED_ROUNDS", 1),
        createInstance("event_000110", "UNTIL_CONDITION"),
        createInstance("event_000114", "UNTIL_WORLD_EVENT_END"),
        createInstance("event_000112", "PERMANENT"),
      ],
      definitions,
      {
        timing: "ROUND_END",
        currentTurn: 2,
        currentPlayerId: null,
        updateSequence: 2,
        endedWorldEventIds: new Set(["event_000115"]),
        getConditionContext: () => CONDITION_CONTEXT,
      },
    );

    expect(result.endedInstances.map((item) => item.reason)).toEqual([
      "EXPIRED",
      "CONDITION_MET",
      "WORLD_EVENT_ENDED",
    ]);
    expect(result.activeInstances).toEqual([createInstance("event_000112", "PERMANENT")]);
    expect(result.endInstructions).toHaveLength(3);
  });

  it("updates player-turn durations only for their triggering player", () => {
    const definition = createDefinition("event_000113", {
      type: "FIXED_ROUNDS",
      rounds: 2,
      updateTiming: "TRIGGER_PLAYER_TURN_END",
      repeat: { policy: "IGNORE" },
    });
    const catalog = { [definition.eventId]: definition };
    const instance = createInstance("event_000113", "FIXED_ROUNDS");
    const skipped = advanceEventDurations([instance], catalog, {
      timing: "TRIGGER_PLAYER_TURN_END",
      currentTurn: 2,
      currentPlayerId: "player-2",
      updateSequence: 2,
      endedWorldEventIds: new Set(),
      getConditionContext: () => CONDITION_CONTEXT,
    });
    const updated = advanceEventDurations(skipped.activeInstances, catalog, {
      timing: "TRIGGER_PLAYER_TURN_END",
      currentTurn: 2,
      currentPlayerId: "player-1",
      updateSequence: 3,
      endedWorldEventIds: new Set(),
      getConditionContext: () => CONDITION_CONTEXT,
    });

    expect(skipped.activeInstances[0]).toEqual(instance);
    expect(updated.activeInstances[0]).toMatchObject({ remainingRounds: 1 });
  });
});
