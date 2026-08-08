import { describe, expect, it } from "vitest";

import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import {
  validateEventPoolDefinition,
  validateEventPoolDefinitionCatalog,
  type EventPoolDefinition,
} from "./event-pool-definition.ts";

const EVENT: EventDefinition = {
  eventId: "event_000102",
  name: "Test Event",
  description: "A test event used to validate event pools.",
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
const POOL: EventPoolDefinition = {
  poolId: "event-pool.test",
  name: "Test Event Pool",
  entries: [{ eventId: EVENT.eventId, weightAdjustment: 0 }],
};

describe("event pool definition validation", () => {
  it("accepts a valid event pool and catalog", () => {
    expect(() => validateEventPoolDefinition(POOL, EVENT_CATALOG)).not.toThrow();
    expect(() =>
      validateEventPoolDefinitionCatalog({ [POOL.poolId]: POOL }, EVENT_CATALOG),
    ).not.toThrow();
  });

  it("rejects empty pools, unknown events, and duplicate entries", () => {
    expect(() => validateEventPoolDefinition({ ...POOL, entries: [] }, EVENT_CATALOG)).toThrow(
      "at least one entry",
    );

    expect(() =>
      validateEventPoolDefinition(
        { ...POOL, entries: [{ eventId: "event_999999", weightAdjustment: 0 }] },
        EVENT_CATALOG,
      ),
    ).toThrow("unknown event");

    expect(() =>
      validateEventPoolDefinition(
        { ...POOL, entries: [POOL.entries[0]!, POOL.entries[0]!] },
        EVENT_CATALOG,
      ),
    ).toThrow("Duplicate event pool entry");
  });

  it("rejects catalog keys that do not match pool ids", () => {
    expect(() =>
      validateEventPoolDefinitionCatalog({ "event-pool.wrong": POOL }, EVENT_CATALOG),
    ).toThrow("does not match pool id");
  });
});
