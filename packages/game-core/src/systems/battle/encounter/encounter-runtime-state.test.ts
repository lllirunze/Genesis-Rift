import { describe, expect, it } from "vitest";

import { createEncounterRuntimeState } from "./encounter-runtime-state.ts";

describe("createEncounterRuntimeState", () => {
  it("creates an active encounter with its configured maximum health", () => {
    expect(
      createEncounterRuntimeState(
        "encounter-instance-1",
        {
          encounterDefinitionId: "encounter_000001",
          name: "Wild Beast",
          maximumHealth: 28,
          physicalAttack: 8,
          physicalDefense: 2,
          evasionRate: 5,
        },
        "player-1",
        "tile_0_0_0" as never,
      ),
    ).toMatchObject({
      status: "ACTIVE",
      currentHealth: 28,
      currentShield: 0,
      triggeringPlayerId: "player-1",
    });
  });
});
