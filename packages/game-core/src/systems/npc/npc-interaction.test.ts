import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { evaluateNpcInteractionEligibility } from "./npc-interaction.ts";

const BLACKSMITH = {
  definitionId: "npc_000001",
  name: "blacksmith",
  services: [
    {
      serviceType: "crafting",
      requiredConditionIds: ["condition_000001"],
      requiredEnvironmentTags: ["day"],
    },
  ],
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
        { playerTileId: tileId, serviceType: "crafting", environmentTags: ["day"] },
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
        {
          playerTileId: "tile-road" as TileId,
          serviceType: "crafting",
          environmentTags: ["day"],
        },
      ),
    ).toEqual({ allowed: false, reason: "OUT_OF_RANGE" });
  });

  it("rejects a daytime service when the current public environment is night", () => {
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
        { playerTileId: tileId, serviceType: "crafting", environmentTags: ["night"] },
      ),
    ).toEqual({ allowed: false, reason: "ENVIRONMENT_UNAVAILABLE" });
  });
});
