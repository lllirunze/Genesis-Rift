import { describe, expect, it } from "vitest";

import type { EventPoolCandidate } from "./collect-event-pool-candidates.ts";
import type { EventDefinition } from "./event-definition.ts";
import { createPendingEventInstance, validateEventInstance } from "./event-instance.ts";

/**
 * 方法名：createCandidate
 * 作用：创建指定揭露方式的事件候选测试数据。
 * @param revealMode 事件采用的揭露方式。
 * @returns 可用于创建事件实例的候选事件。
 */
function createCandidate(revealMode: EventDefinition["revealMode"]): EventPoolCandidate {
  const event: EventDefinition = {
    eventId: `event.test.${revealMode.toLowerCase()}`,
    name: "Test Event",
    description: "An event used to test runtime event instances.",
    triggerCondition: null,
    category: "common",
    rarity: "common",
    tags: ["test"],
    revealMode,
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
  };

  return {
    event,
    sourcePoolIds: ["event-pool.test"],
    weightAdjustment: 0,
    currentWeight: 100,
  };
}

describe("event instance", () => {
  it("creates a pending instance without copying the event definition", () => {
    const instance = createPendingEventInstance({
      instanceId: "event-instance-1",
      candidate: createCandidate("FORCED"),
      triggeringPlayerId: null,
      triggeredAtTurn: 3,
    });

    expect(instance).toEqual({
      instanceId: "event-instance-1",
      eventId: "event.test.forced",
      triggeringPlayerId: null,
      sourcePoolIds: ["event-pool.test"],
      triggeredAtTurn: 3,
      status: "PENDING_REVEAL",
    });
    expect("event" in instance).toBe(false);
    expect(() => validateEventInstance(instance)).not.toThrow();
  });

  it("requires a triggering player for optional reveal events", () => {
    expect(() =>
      createPendingEventInstance({
        instanceId: "event-instance-2",
        candidate: createCandidate("OPTIONAL"),
        triggeringPlayerId: null,
        triggeredAtTurn: 3,
      }),
    ).toThrow("require a triggering player");
  });

  it("rejects duplicated source pools and invalid transition times", () => {
    const candidate = createCandidate("FORCED");

    expect(() =>
      createPendingEventInstance({
        instanceId: "event-instance-3",
        candidate: {
          ...candidate,
          sourcePoolIds: ["event-pool.test", "event-pool.test"],
        },
        triggeringPlayerId: "player-1",
        triggeredAtTurn: 3,
      }),
    ).toThrow("Duplicate candidate.sourcePoolIds");

    expect(() =>
      validateEventInstance({
        instanceId: "event-instance-4",
        eventId: candidate.event.eventId,
        triggeringPlayerId: "player-1",
        sourcePoolIds: ["event-pool.test"],
        triggeredAtTurn: 3,
        status: "REVEALED",
        revealedAtTurn: 2,
      }),
    ).toThrow("must not be earlier");
  });
});
