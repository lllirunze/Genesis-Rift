import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { evaluateNpcInteractionEligibility } from "./npc-interaction.ts";

const BLACKSMITH = {
  definitionId: "npc_000001",
  name: "blacksmith",
  services: [{ serviceType: "crafting", requiredConditionIds: ["condition_000001"] }],
} as const;

describe("evaluateNpcInteractionEligibility", () => {
  it("allows a player on the same tile to use an available declared service", () => {
    const tileId = "tile-town" as TileId;

    expect(
      evaluateNpcInteractionEligibility(
        BLACKSMITH,
        {
          npcId: "npc-instance-1",
          definitionId: "npc_000001",
          currentTileId: tileId,
          available: true,
        },
        { playerTileId: tileId, serviceType: "crafting" },
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("rejects interaction when the player is not on the NPC tile", () => {
    expect(
      evaluateNpcInteractionEligibility(
        BLACKSMITH,
        {
          npcId: "npc-instance-1",
          definitionId: "npc_000001",
          currentTileId: "tile-town" as TileId,
          available: true,
        },
        { playerTileId: "tile-road" as TileId, serviceType: "crafting" },
      ),
    ).toEqual({ allowed: false, reason: "OUT_OF_RANGE" });
  });
});
