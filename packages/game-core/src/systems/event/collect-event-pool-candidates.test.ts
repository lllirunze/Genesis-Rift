import { describe, expect, it } from "vitest";

import { collectEventPoolCandidates } from "./collect-event-pool-candidates.ts";
import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import type { EventPoolDefinition } from "./event-pool-definition.ts";

const EVENT: EventDefinition = {
  eventId: "event_000102",
  name: "Test Event",
  description: "A test event used to collect pool candidates.",
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

const EVENT_CATALOG: EventDefinitionCatalog = { [EVENT.eventId]: EVENT };

describe("event pool candidate collection", () => {
  it("merges duplicate events without multiplying their probability", () => {
    const pools: EventPoolDefinition[] = [
      {
        poolId: "event-pool.region",
        name: "Region Pool",
        entries: [{ eventId: EVENT.eventId, weightAdjustment: 5 }],
      },
      {
        poolId: "event-pool.weather",
        name: "Weather Pool",
        entries: [{ eventId: EVENT.eventId, weightAdjustment: 10 }],
      },
    ];

    expect(collectEventPoolCandidates(pools, EVENT_CATALOG)).toEqual([
      {
        event: EVENT,
        sourcePoolIds: ["event-pool.region", "event-pool.weather"],
        weightAdjustment: 10,
        currentWeight: 110,
      },
    ]);
  });

  it("clamps adjusted event weights at zero", () => {
    expect(
      collectEventPoolCandidates(
        [
          {
            poolId: "event-pool.disabled",
            name: "Disabled Pool",
            entries: [{ eventId: EVENT.eventId, weightAdjustment: -200 }],
          },
        ],
        EVENT_CATALOG,
      )[0]?.currentWeight,
    ).toBe(0);
  });
});
