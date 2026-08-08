import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../random/core/random-seed.ts";
import { RandomStream } from "../random/core/random-stream.ts";
import type { EventPoolCandidate } from "./collect-event-pool-candidates.ts";
import type { EventDefinition } from "./event-definition.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import {
  filterEligibleEventCandidates,
  selectEventCandidate,
  type EventCandidateSelectionContext,
} from "./select-event-candidate.ts";

const CONDITION_CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: "region_000001",
  terrainDefinitionId: "terrain_000002",
  featureIds: new Set(),
  weatherId: "weather_000002",
  periodId: "day",
  player: null,
  questStages: new Map(),
  dungeonId: null,
  worldStateIds: new Set(),
  revealedEventIds: new Set(),
  isFirstVisit: false,
};

/**
 * 方法名：createEvent
 * 作用：创建供候选筛选测试复用的最小合法事件定义。
 * @param eventId 事件定义标识。
 * @param overrides 需要覆盖的事件字段。
 * @returns 可用于候选筛选的事件定义。
 */
function createEvent(eventId: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    eventId,
    name: eventId,
    description: "An event used to test event candidate selection.",
    triggerCondition: null,
    category: "common",
    rarity: "common",
    tags: ["test"],
    revealMode: "FORCED",
    repeatRule: "repeatable",
    resolution: {
      type: "DIRECT",
      effects: [
        {
          effectKey: "grantCoin",
          effectId: "coin.modify",
          targetType: "TRIGGER_PLAYER",
          parameters: { amount: 1 },
          failurePolicy: "STOP",
        },
      ],
    },
    duration: { type: "IMMEDIATE" },
    baseWeight: 100,
    cooldownTurns: 0,
    ...overrides,
  };
}

/**
 * 方法名：createCandidate
 * 作用：创建供筛选与抽取测试复用的事件候选。
 * @param event 事件静态定义。
 * @param currentWeight 当前参与随机抽取的整数权重。
 * @returns 对应事件候选。
 */
function createCandidate(event: EventDefinition, currentWeight = 100): EventPoolCandidate {
  return {
    event,
    sourcePoolIds: ["event-pool.test"],
    weightAdjustment: currentWeight - event.baseWeight,
    currentWeight,
  };
}

/**
 * 方法名：createSelectionContext
 * 作用：创建供候选筛选测试复用的标准上下文。
 * @param overrides 需要覆盖的筛选上下文字段。
 * @returns 候选筛选上下文。
 */
function createSelectionContext(
  overrides: Partial<EventCandidateSelectionContext> = {},
): EventCandidateSelectionContext {
  return {
    triggeringPlayerId: "player-1",
    currentTurn: 10,
    conditionContext: CONDITION_CONTEXT,
    revealedOccurrences: [],
    ...overrides,
  };
}

describe("event candidate selection", () => {
  it("filters candidates by trigger conditions and positive current weight", () => {
    const eligible = createCandidate(createEvent("event_000118"));
    const wrongRegion = createCandidate(
      createEvent("event_000122", {
        triggerCondition: {
          type: "CONDITION",
          conditionId: "map.regionIs",
          parameters: { regionDefinitionId: "region_000002" },
        },
      }),
    );
    const zeroWeight = createCandidate(createEvent("event_000123"), 0);

    expect(
      filterEligibleEventCandidates([eligible, wrongRegion, zeroWeight], createSelectionContext()),
    ).toEqual([eligible]);
  });

  it("enforces per-game and per-player reveal limits", () => {
    const oncePerGame = createCandidate(createEvent("event_000119", { repeatRule: "oncePerGame" }));
    const oncePerPlayer = createCandidate(
      createEvent("event_000120", { repeatRule: "oncePerPlayer" }),
    );
    const context = createSelectionContext({
      revealedOccurrences: [
        { eventId: "event_000119", triggeringPlayerId: "player-2", revealedAtTurn: 2 },
        { eventId: "event_000120", triggeringPlayerId: "player-2", revealedAtTurn: 3 },
      ],
    });

    expect(filterEligibleEventCandidates([oncePerGame, oncePerPlayer], context)).toEqual([
      oncePerPlayer,
    ]);
    expect(
      filterEligibleEventCandidates([oncePerPlayer], {
        ...context,
        triggeringPlayerId: "player-2",
      }),
    ).toEqual([]);
  });

  it("applies cooldowns within the triggering player scope", () => {
    const candidate = createCandidate(createEvent("event_000117", { cooldownTurns: 2 }));
    const occurrence = {
      eventId: candidate.event.eventId,
      triggeringPlayerId: "player-1",
      revealedAtTurn: 8,
    } as const;

    expect(
      filterEligibleEventCandidates(
        [candidate],
        createSelectionContext({ revealedOccurrences: [occurrence] }),
      ),
    ).toEqual([]);
    expect(
      filterEligibleEventCandidates(
        [candidate],
        createSelectionContext({ currentTurn: 11, revealedOccurrences: [occurrence] }),
      ),
    ).toEqual([candidate]);
  });

  it("selects reproducibly with the event random stream", () => {
    const candidates = [
      createCandidate(createEvent("event_000125"), 100),
      createCandidate(createEvent("event_000121"), 40),
    ];
    const seed = createRandomStreamSeed("0123456789abcdef");
    const firstStream = RandomStream.create("event", "event-pool.test", seed);
    const secondStream = RandomStream.create("event", "event-pool.test", seed);

    expect(
      selectEventCandidate(firstStream, candidates, createSelectionContext())?.event.eventId,
    ).toBe(selectEventCandidate(secondStream, candidates, createSelectionContext())?.event.eventId);
  });

  it("returns null without advancing randomness when no candidate is eligible", () => {
    const stream = RandomStream.create(
      "event",
      "event-pool.test",
      createRandomStreamSeed("0123456789abcdef"),
    );
    const initialState = stream.exportState();

    expect(selectEventCandidate(stream, [], createSelectionContext())).toBeNull();
    expect(stream.exportState()).toEqual(initialState);
  });

  it("rejects random streams owned by other business modules", () => {
    const stream = RandomStream.create(
      "combat",
      "event-pool.test",
      createRandomStreamSeed("0123456789abcdef"),
    );

    expect(() => selectEventCandidate(stream, [], createSelectionContext())).toThrow(
      "requires an event random stream",
    );
  });
});
