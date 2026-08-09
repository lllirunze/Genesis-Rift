import { describe, expect, it } from "vitest";

import type { PlayerId, TileId } from "@genesis-rift/shared";

import { createDeathRelicState } from "./death-relic-state.ts";
import { inspectDeathRelic } from "./death-relic-inspection.ts";

const OWNER_ID = "player_a" as PlayerId;
const VISITOR_ID = "player_b" as PlayerId;
const RELIC_TILE_ID = "tile_000001" as TileId;

describe("inspectDeathRelic", () => {
  it("允许位于遗物格的玩家检视公开内容与剩余拾取额度", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: RELIC_TILE_ID,
      coinQuantity: 3,
      items: [
        {
          instanceId: "item-instance-1",
          definitionId: "item_000002",
          ownerPlayerId: OWNER_ID,
          quantity: 1,
          stackCompatibilityKey: "default",
        },
      ],
    });

    const result = inspectDeathRelic({
      relic,
      playerId: VISITOR_ID,
      currentTileId: RELIC_TILE_ID,
    });

    expect(result).toMatchObject({
      outcome: "INSPECTED",
      inspection: {
        ownerPlayerId: OWNER_ID,
        remainingGlobalTurns: 10,
        pickedUnitCount: 0,
        remainingPickupUnitCount: 2,
        contents: [
          { kind: "COIN", quantity: 3 },
          { kind: "ITEM", item: { instanceId: "item-instance-1" } },
        ],
      },
    });
  });

  it("拒绝不在遗物格的玩家检视遗物包", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: RELIC_TILE_ID,
      coinQuantity: 0,
      items: [],
    });

    expect(
      inspectDeathRelic({
        relic,
        playerId: VISITOR_ID,
        currentTileId: "tile_000002" as TileId,
      }),
    ).toEqual({
      outcome: "REJECTED",
      reason: "NOT_ON_RELIC_TILE",
    });
  });
});
