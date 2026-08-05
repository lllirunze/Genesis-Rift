import { validateEventPoolDefinitionCatalog } from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import { EVENT_DEFINITION_CATALOG } from "./event-definitions.ts";
import {
  EVENT_POOL_DEFINITION_CATALOG,
  WILDERNESS_EXPLORATION_EVENT_POOL,
} from "./event-pool-definitions.ts";

describe("event pool definitions", () => {
  it("provides valid pools that only reference known events", () => {
    expect(() =>
      validateEventPoolDefinitionCatalog(EVENT_POOL_DEFINITION_CATALOG, EVENT_DEFINITION_CATALOG),
    ).not.toThrow();
  });

  it("keeps wilderness exploration entries as references instead of copied definitions", () => {
    expect(WILDERNESS_EXPLORATION_EVENT_POOL.entries).toEqual([
      { eventId: "event.common.abandoned-camp", weightAdjustment: 0 },
      { eventId: "event.encounter.wild-beast-attack", weightAdjustment: 0 },
    ]);
  });
});
