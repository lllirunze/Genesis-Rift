import { validateEventPoolDefinitionCatalog } from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import { EVENT_DEFINITION_CATALOG } from "./event-definitions.ts";
import {
  EVENT_POOL_DEFINITION_CATALOG,
  NPC_TRAVELER_INTERACTION_EVENT_POOL,
  QUEST_COMPLETION_EVENT_POOL,
  WILDERNESS_EXPLORATION_EVENT_POOL,
  WEATHER_DISASTER_EVENT_POOL,
  WORLD_STATE_EVENT_POOL,
} from "./event-pool-definitions.ts";

describe("event pool definitions", () => {
  it("provides valid pools that only reference known events", () => {
    expect(() =>
      validateEventPoolDefinitionCatalog(EVENT_POOL_DEFINITION_CATALOG, EVENT_DEFINITION_CATALOG),
    ).not.toThrow();
  });

  it("keeps wilderness exploration entries as references instead of copied definitions", () => {
    expect(WILDERNESS_EXPLORATION_EVENT_POOL.entries).toEqual([
      { eventId: "event_000001", weightAdjustment: 0 },
      { eventId: "event_000002", weightAdjustment: 0 },
    ]);
  });

  it("provides separate NPC, quest, weather and world-state source pools", () => {
    expect(NPC_TRAVELER_INTERACTION_EVENT_POOL.entries).toHaveLength(1);
    expect(QUEST_COMPLETION_EVENT_POOL.entries).toHaveLength(1);
    expect(WEATHER_DISASTER_EVENT_POOL.entries).toHaveLength(1);
    expect(WORLD_STATE_EVENT_POOL.entries).toHaveLength(1);
  });
});
