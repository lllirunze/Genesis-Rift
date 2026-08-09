import { describe, expect, it } from "vitest";

import type { PlayerId, TileId } from "@genesis-rift/shared";

import { advanceDeathRelicDurationAtGlobalTurnEnd } from "./advance-death-relic-duration.ts";
import { createDeathRelicState } from "./death-relic-state.ts";

const OWNER_ID = "player_a" as PlayerId;
const TILE_ID = "tile_000001" as TileId;

describe("advance death relic duration", () => {
  it("每个完整全局回合结束时减少一次遗物开放时间", () => {
    const result = advanceDeathRelicDurationAtGlobalTurnEnd(
      createDeathRelicState({
        deathRelicId: "death-relic-1",
        ownerPlayerId: OWNER_ID,
        tileId: TILE_ID,
        coinQuantity: 3,
        items: [],
        remainingGlobalTurns: 10,
      }),
    );

    expect(result).toMatchObject({ outcome: "TICKED", state: { remainingGlobalTurns: 9 } });
  });

  it("最后一个开放回合结束时返回消失结果与未拾取遗物内容", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: TILE_ID,
      coinQuantity: 3,
      items: [],
      remainingGlobalTurns: 1,
    });
    const result = advanceDeathRelicDurationAtGlobalTurnEnd(relic);

    expect(result).toEqual({ outcome: "EXPIRED", expiredRelic: relic });
  });
});
