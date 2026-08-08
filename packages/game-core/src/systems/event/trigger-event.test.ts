import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../random/core/random-seed.ts";
import { RandomStream } from "../random/core/random-stream.ts";
import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import type { EventPoolDefinitionCatalog } from "./event-pool-definition.ts";
import { createEventRuntimeState } from "./event-runtime-state.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { triggerEvent } from "./trigger-event.ts";

const CONDITION_CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: null,
  terrainDefinitionId: null,
  featureIds: new Set(),
  weatherId: null,
  periodId: "day",
  player: null,
  questStages: new Map(),
  dungeonId: null,
  worldStateIds: new Set(),
  revealedEventIds: new Set(),
  isFirstVisit: false,
};

/**
 * 方法名：createEventDefinition
 * 作用：创建事件触发编排测试使用的最小事件定义。
 * @param revealMode 事件揭露方式。
 * @param resolutionType 事件采用直接结算或玩家选项。
 * @returns 合法的事件静态定义。
 */
function createEventDefinition(
  revealMode: EventDefinition["revealMode"],
  resolutionType: "DIRECT" | "CHOICE",
): EventDefinition {
  return {
    eventId: "event_000201",
    name: "Flow Test",
    description: "An event used to test the trigger flow.",
    triggerCondition: null,
    category: "common",
    rarity: "common",
    tags: ["test"],
    revealMode,
    repeatRule: "repeatable",
    resolution:
      resolutionType === "DIRECT"
        ? { type: "DIRECT", effects: [] }
        : {
            type: "CHOICE",
            options: [
              {
                optionId: "continue",
                name: "Continue",
                description: "Continue the test event.",
                availabilityCondition: null,
                effects: [],
              },
            ],
          },
    duration: { type: "IMMEDIATE" },
    baseWeight: 100,
    cooldownTurns: 0,
  };
}

/**
 * 方法名：createCatalogs
 * 作用：根据事件定义创建匹配的事件与事件池注册表。
 * @param definition 需要放入测试事件池的定义。
 * @returns 事件定义注册表与事件池注册表。
 */
function createCatalogs(definition: EventDefinition): {
  readonly events: EventDefinitionCatalog;
  readonly pools: EventPoolDefinitionCatalog;
} {
  return {
    events: { [definition.eventId]: definition },
    pools: {
      "event-pool.test": {
        poolId: "event-pool.test",
        name: "Test Pool",
        entries: [{ eventId: definition.eventId, weightAdjustment: 0 }],
      },
    },
  };
}

/** 创建事件模块专用的固定种子随机流。 */
function createEventRandomStream(): RandomStream {
  return RandomStream.create(
    "event",
    "event-pool.test",
    createRandomStreamSeed("0123456789abcdef"),
  );
}

describe("event trigger flow", () => {
  it("creates and automatically reveals a forced direct event", () => {
    const catalogs = createCatalogs(createEventDefinition("FORCED", "DIRECT"));
    const result = triggerEvent(
      createEventRuntimeState(),
      createEventRandomStream(),
      catalogs.events,
      catalogs.pools,
      {
        instanceId: "event-instance-201",
        poolIds: ["event-pool.test"],
        triggeringPlayerId: "player-1",
        currentTurn: 3,
        conditionContext: CONDITION_CONTEXT,
      },
    );

    expect(result.instruction).toMatchObject({
      type: "READY_TO_RESOLVE",
      instance: { status: "REVEALED", eventId: "event_000201" },
    });
    expect(result.state.instances).toHaveLength(1);
  });

  it("keeps optional events hidden until the player decides", () => {
    const catalogs = createCatalogs(createEventDefinition("OPTIONAL", "CHOICE"));
    const result = triggerEvent(
      createEventRuntimeState(),
      createEventRandomStream(),
      catalogs.events,
      catalogs.pools,
      {
        instanceId: "event-instance-202",
        poolIds: ["event-pool.test"],
        triggeringPlayerId: "player-1",
        currentTurn: 3,
        conditionContext: CONDITION_CONTEXT,
      },
    );

    expect(result.instruction).toMatchObject({
      type: "WAIT_REVEAL_DECISION",
      instance: { status: "PENDING_REVEAL" },
    });
  });

  it("returns no event without consuming an instance when no candidate is eligible", () => {
    const definition = {
      ...createEventDefinition("FORCED", "DIRECT"),
      triggerCondition: {
        type: "CONDITION",
        conditionId: "map.regionIs",
        parameters: { regionDefinitionId: "region_000999" },
      },
    } as const satisfies EventDefinition;
    const catalogs = createCatalogs(definition);
    const state = createEventRuntimeState();
    const result = triggerEvent(state, createEventRandomStream(), catalogs.events, catalogs.pools, {
      instanceId: "unused-instance",
      poolIds: ["event-pool.test"],
      triggeringPlayerId: "player-1",
      currentTurn: 3,
      conditionContext: CONDITION_CONTEXT,
    });

    expect(result).toEqual({ state, instruction: { type: "NO_EVENT" } });
  });
});
