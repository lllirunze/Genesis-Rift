import { describe, expect, it } from "vitest";

import type { EventDefinition } from "./event-definition.ts";
import type { PendingRevealEventInstance } from "./event-instance.ts";
import {
  createRevealedEventOccurrence,
  decideOptionalEventReveal,
  revealForcedEvent,
} from "./event-reveal.ts";

const BASE_DEFINITION: EventDefinition = {
  eventId: "event_000104",
  name: "Reveal Test",
  description: "An event used to test event reveal transitions.",
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
};

const PENDING_INSTANCE: PendingRevealEventInstance = {
  instanceId: "event-instance-1",
  eventId: BASE_DEFINITION.eventId,
  triggeringPlayerId: "player-1",
  sourcePoolIds: ["event-pool.test"],
  triggeredAtTurn: 4,
  status: "PENDING_REVEAL",
};

describe("event reveal", () => {
  it("automatically reveals forced events", () => {
    const revealed = revealForcedEvent(PENDING_INSTANCE, BASE_DEFINITION, 4);

    expect(revealed).toMatchObject({ status: "REVEALED", revealedAtTurn: 4 });
    expect(createRevealedEventOccurrence(revealed)).toEqual({
      eventId: BASE_DEFINITION.eventId,
      triggeringPlayerId: "player-1",
      revealedAtTurn: 4,
    });
  });

  it("allows only the triggering player to reveal an optional event", () => {
    const definition = { ...BASE_DEFINITION, revealMode: "OPTIONAL" } as const;

    expect(() =>
      decideOptionalEventReveal(PENDING_INSTANCE, definition, {
        actingPlayerId: "player-2",
        action: "REVEAL",
        decidedAtTurn: 4,
      }),
    ).toThrow("Only the triggering player");

    expect(
      decideOptionalEventReveal(PENDING_INSTANCE, definition, {
        actingPlayerId: "player-1",
        action: "REVEAL",
        decidedAtTurn: 4,
      }),
    ).toMatchObject({ status: "REVEALED", revealedAtTurn: 4 });
  });

  it("declines optional events without creating revealed history", () => {
    const definition = { ...BASE_DEFINITION, revealMode: "OPTIONAL" } as const;
    const declined = decideOptionalEventReveal(PENDING_INSTANCE, definition, {
      actingPlayerId: "player-1",
      action: "DECLINE",
      decidedAtTurn: 5,
    });

    expect(declined).toMatchObject({ status: "DECLINED", declinedAtTurn: 5 });
    expect("revealedAtTurn" in declined).toBe(false);
  });

  it("rejects reveal APIs that do not match the configured mode", () => {
    const optionalDefinition = { ...BASE_DEFINITION, revealMode: "OPTIONAL" } as const;

    expect(() => revealForcedEvent(PENDING_INSTANCE, optionalDefinition, 4)).toThrow(
      "Only forced reveal events",
    );
    expect(() =>
      decideOptionalEventReveal(PENDING_INSTANCE, BASE_DEFINITION, {
        actingPlayerId: "player-1",
        action: "DECLINE",
        decidedAtTurn: 4,
      }),
    ).toThrow("Only optional reveal events");
  });

  it("rejects unknown reveal actions and mismatched definitions", () => {
    const optionalDefinition = { ...BASE_DEFINITION, revealMode: "OPTIONAL" } as const;

    expect(() =>
      decideOptionalEventReveal(PENDING_INSTANCE, optionalDefinition, {
        actingPlayerId: "player-1",
        action: "SKIP" as "DECLINE",
        decidedAtTurn: 4,
      }),
    ).toThrow("Unsupported event reveal action");

    expect(() =>
      revealForcedEvent(PENDING_INSTANCE, { ...BASE_DEFINITION, eventId: "event_000998" }, 4),
    ).toThrow("does not match definition");
  });
});
