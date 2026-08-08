import { describe, expect, it } from "vitest";

import type { EventDefinition } from "./event-definition.ts";
import type { EventInstance } from "./event-instance.ts";
import { createEventView } from "./event-view.ts";

const DEFINITION: EventDefinition = {
  eventId: "event_000103",
  name: "Hidden Choice",
  description: "A hidden event that offers two choices after reveal.",
  triggerCondition: null,
  category: "adventure",
  rarity: "rare",
  tags: ["hidden", "secret-effect"],
  revealMode: "OPTIONAL",
  repeatRule: "oncePerPlayer",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "accept",
        name: "Accept",
        description: "Accept the unknown offer.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "grantCoin",
            effectId: "coin.modify",
            targetType: "TRIGGER_PLAYER",
            parameters: { amount: 5 },
            failurePolicy: "STOP",
          },
        ],
      },
      {
        optionId: "leave",
        name: "Leave",
        description: "Leave without accepting the offer.",
        availabilityCondition: null,
        effects: [],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 40,
  cooldownTurns: 0,
};

const PENDING_INSTANCE: EventInstance = {
  instanceId: "event-instance-1",
  eventId: DEFINITION.eventId,
  triggeringPlayerId: "player-1",
  sourcePoolIds: ["event-pool.test"],
  triggeredAtTurn: 2,
  status: "PENDING_REVEAL",
};

describe("event view", () => {
  it("hides event identity and content before reveal", () => {
    const ownerView = createEventView(PENDING_INSTANCE, DEFINITION, "player-1");
    const otherView = createEventView(PENDING_INSTANCE, DEFINITION, "player-2");

    expect(ownerView).toEqual({
      instanceId: "event-instance-1",
      triggeringPlayerId: "player-1",
      status: "PENDING_REVEAL",
      revealMode: "OPTIONAL",
      allowedActions: ["REVEAL", "DECLINE"],
    });
    expect(otherView).toMatchObject({ allowedActions: [] });
    expect("eventId" in ownerView).toBe(false);
    expect("content" in ownerView).toBe(false);
  });

  it("reveals display content without exposing effects or hidden conditions", () => {
    const revealed: EventInstance = {
      ...PENDING_INSTANCE,
      status: "REVEALED",
      revealedAtTurn: 2,
    };
    const view = createEventView(revealed, DEFINITION, "player-1");

    expect(view).toMatchObject({
      status: "REVEALED",
      content: {
        eventId: DEFINITION.eventId,
        name: "Hidden Choice",
        resolution: {
          type: "CHOICE",
          options: [
            { optionId: "accept", name: "Accept" },
            { optionId: "leave", name: "Leave", isAvailable: true },
          ],
        },
      },
    });
    expect(JSON.stringify(view)).not.toContain("coin.modify");
    expect(JSON.stringify(view)).not.toContain("secret-effect");
  });

  it("keeps declined event content hidden", () => {
    const declined: EventInstance = {
      ...PENDING_INSTANCE,
      status: "DECLINED",
      declinedAtTurn: 3,
    };
    const view = createEventView(declined, DEFINITION, "player-1");

    expect(view).toEqual({
      instanceId: "event-instance-1",
      triggeringPlayerId: "player-1",
      status: "DECLINED",
    });
    expect(JSON.stringify(view)).not.toContain(DEFINITION.eventId);
  });
});
