import { describe, expect, it } from "vitest";

import type { EventDefinition } from "./event-definition.ts";
import type { EventInstance, ResolvedEventInstance } from "./event-instance.ts";
import {
  activateEventDurationInState,
  addEventInstance,
  advanceEventRuntimeState,
  createEventRuntimeState,
  transitionEventInstance,
} from "./event-runtime-state.ts";

const DEFINITION: EventDefinition = {
  eventId: "event_000105",
  name: "Runtime State Test",
  description: "An event used to test the unified runtime container.",
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
  duration: {
    type: "FIXED_ROUNDS",
    rounds: 2,
    updateTiming: "ROUND_END",
    repeat: { policy: "IGNORE" },
  },
  baseWeight: 100,
  cooldownTurns: 0,
};

const RESOLVED_EVENT: ResolvedEventInstance = {
  instanceId: "event-instance-resolved",
  eventId: DEFINITION.eventId,
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

describe("event runtime state", () => {
  it("accepts only declared one-step event state transitions", () => {
    const pending: EventInstance = {
      instanceId: "event-instance-pending",
      eventId: DEFINITION.eventId,
      triggeringPlayerId: "player-1",
      sourcePoolIds: ["event-pool.test"],
      triggeredAtTurn: 1,
      status: "PENDING_REVEAL",
    };
    const initial = addEventInstance(createEventRuntimeState(), pending);
    const revealed: EventInstance = {
      ...pending,
      status: "REVEALED",
      revealedAtTurn: 1,
    };
    const transitioned = transitionEventInstance(initial, revealed);

    expect(transitioned.instance.status).toBe("REVEALED");
    expect(() => transitionEventInstance(transitioned.state, revealed)).toThrow(
      "Invalid event state transition",
    );
  });

  it("activates each resolved event duration only once", () => {
    const state = addEventInstance(createEventRuntimeState(), RESOLVED_EVENT);
    const activated = activateEventDurationInState(state, RESOLVED_EVENT, DEFINITION, {
      durationInstanceId: "duration-1",
      activatedAtTurn: 1,
      activatedAtSequence: 1,
    });

    expect(activated).toMatchObject({
      outcome: "CREATED",
      activatedInstance: { durationInstanceId: "duration-1", remainingRounds: 2 },
    });
    expect(() =>
      activateEventDurationInState(activated.state, RESOLVED_EVENT, DEFINITION, {
        durationInstanceId: "duration-2",
        activatedAtTurn: 1,
        activatedAtSequence: 2,
      }),
    ).toThrow("already activated");
  });

  it("prevents the same global duration update sequence from running twice", () => {
    const state = addEventInstance(createEventRuntimeState(), RESOLVED_EVENT);
    const activated = activateEventDurationInState(state, RESOLVED_EVENT, DEFINITION, {
      durationInstanceId: "duration-1",
      activatedAtTurn: 1,
      activatedAtSequence: 1,
    });
    const input = {
      timing: "ROUND_END" as const,
      currentTurn: 2,
      currentPlayerId: null,
      updateSequence: 2,
      endedWorldEventIds: new Set<string>(),
      getConditionContext: () => ({
        regionDefinitionId: null,
        terrainDefinitionId: null,
        featureIds: new Set<string>(),
        weatherId: null,
        periodId: "day",
        player: null,
        questStages: new Map<string, string>(),
        dungeonId: null,
        worldStateIds: new Set<string>(),
        revealedEventIds: new Set<string>(),
        isFirstVisit: false,
      }),
    };
    const advanced = advanceEventRuntimeState(
      activated.state,
      { [DEFINITION.eventId]: DEFINITION },
      input,
    );

    expect(advanced.state.activeDurations[0]).toMatchObject({ remainingRounds: 1 });
    expect(() =>
      advanceEventRuntimeState(advanced.state, { [DEFINITION.eventId]: DEFINITION }, input),
    ).toThrow("must increase");
  });
});
