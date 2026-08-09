import { describe, expect, it } from "vitest";

import type { PlayerId, TileId } from "@genesis-rift/shared";

import { createDeathRelicState, getDeathRelicPickedUnitCount } from "./death-relic-state.ts";

const OWNER_ID = "player_a" as PlayerId;
const TILE_ID = "tile_000001" as TileId;

describe("death relic state", () => {
  it("创建位于死亡格、默认开放十个全局回合的遗物包", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: TILE_ID,
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

    expect(relic).toMatchObject({
      ownerPlayerId: OWNER_ID,
      tileId: TILE_ID,
      remainingGlobalTurns: 10,
      coinQuantity: 3,
      pickupRecords: [],
    });
  });

  it("未产生拾取记录的玩家默认拾取数量为零", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: TILE_ID,
      coinQuantity: 0,
      items: [],
    });

    expect(getDeathRelicPickedUnitCount(relic, "player_b" as PlayerId)).toBe(0);
  });
});
