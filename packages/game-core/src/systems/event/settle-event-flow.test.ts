import { describe, expect, it } from "vitest";

import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import { EventEffectHandlerRegistry } from "./event-effect-handler-registry.ts";
import { createPendingEventInstance } from "./event-instance.ts";
import { addEventInstance, createEventRuntimeState } from "./event-runtime-state.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import {
  settleEventOption,
  settleEventResolution,
  settleEventReveal,
} from "./settle-event-flow.ts";

const CONTEXT: EventConditionEvaluationContext = {
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

const DEFINITION: EventDefinition = {
  eventId: "event_000202",
  name: "Optional Flow",
  description: "An optional event used to test the settlement flow.",
  triggerCondition: null,
  category: "adventure",
  rarity: "rare",
  tags: ["test"],
  revealMode: "OPTIONAL",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "accept",
        name: "Accept",
        description: "Accept the empty test result.",
        availabilityCondition: null,
        effects: [],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 40,
  cooldownTurns: 0,
};

const DEFINITIONS: EventDefinitionCatalog = { [DEFINITION.eventId]: DEFINITION };

/**
 * 方法名：createPendingState
 * 作用：创建包含一个可选择揭露事件的测试运行时状态。
 * @returns 待揭露事件运行时状态。
 */
function createPendingState() {
  const pending = createPendingEventInstance({
    instanceId: "event-instance-203",
    candidate: {
      event: DEFINITION,
      sourcePoolIds: ["event-pool.test"],
      weightAdjustment: 0,
      currentWeight: 40,
    },
    triggeringPlayerId: "player-1",
    triggeredAtTurn: 4,
  });

  return addEventInstance(createEventRuntimeState(), pending);
}

describe("event settlement flow", () => {
  it("reveals, selects and completes an optional choice event", () => {
    const revealed = settleEventReveal(createPendingState(), DEFINITIONS, {
      instanceId: "event-instance-203",
      actingPlayerId: "player-1",
      action: "REVEAL",
      decidedAtTurn: 4,
    });
    expect(revealed.instruction.type).toBe("WAIT_OPTION_SELECTION");

    const selected = settleEventOption(revealed.state, DEFINITIONS, {
      instanceId: "event-instance-203",
      actingPlayerId: "player-1",
      optionId: "accept",
      selectedAtTurn: 4,
      conditionContext: CONTEXT,
    });
    expect(selected.instruction).toMatchObject({
      type: "READY_TO_RESOLVE",
      instance: { status: "RESOLVING", selectedOptionId: "accept" },
    });

    const completed = settleEventResolution(
      selected.state,
      DEFINITIONS,
      new EventEffectHandlerRegistry(),
      {
        instanceId: "event-instance-203",
        currentTurn: 4,
        durationInstanceId: "event-duration-203",
        updateSequence: 1,
      },
    );

    expect(completed.instruction).toMatchObject({
      type: "COMPLETED",
      instance: { status: "RESOLVED", selectedOptionId: "accept" },
      durationOutcome: "IMMEDIATE",
    });
    expect(completed.state.durationActivatedEventInstanceIds).toEqual(["event-instance-203"]);
  });

  it("ends an optional event without creating occurrence or duration state when declined", () => {
    const result = settleEventReveal(createPendingState(), DEFINITIONS, {
      instanceId: "event-instance-203",
      actingPlayerId: "player-1",
      action: "DECLINE",
      decidedAtTurn: 4,
    });

    expect(result.instruction).toEqual({ type: "DECLINED", instanceId: "event-instance-203" });
    expect(result.state.instances[0]).toMatchObject({ status: "DECLINED" });
    expect(result.state.activeDurations).toEqual([]);
  });
});
