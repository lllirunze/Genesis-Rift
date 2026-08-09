import { describe, expect, it } from "vitest";

import type { PlayerId, TileId } from "@genesis-rift/shared";

import { createDeathRelicState } from "./death-relic-state.ts";
import {
  addDeathRelic,
  advanceDeathRelicRuntimeStateAtGlobalTurnEnd,
  createDeathRelicRuntimeState,
  replaceDeathRelic,
} from "./death-relic-runtime-state.ts";

const PLAYER_ID = "player_a" as PlayerId;
const TILE_ID = "tile_000001" as TileId;

describe("death relic runtime state", () => {
  it("在遗物剩余回合归零时将其从公共交互状态移除", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: PLAYER_ID,
      tileId: TILE_ID,
      coinQuantity: 2,
      items: [],
      remainingGlobalTurns: 1,
    });
    const state = addDeathRelic(createDeathRelicRuntimeState(), relic);

    const result = advanceDeathRelicRuntimeStateAtGlobalTurnEnd(state, 1);

    expect(result.state.relics).toEqual([]);
    expect(result.expiredRelics).toEqual([relic]);
  });

  it("允许将成功拾取内容后的遗物状态写回公共交互状态", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: PLAYER_ID,
      tileId: TILE_ID,
      coinQuantity: 2,
      items: [],
    });
    const state = addDeathRelic(createDeathRelicRuntimeState(), relic);
    const updated = replaceDeathRelic(state, { ...relic, coinQuantity: 0 });

    expect(updated.relics[0]?.coinQuantity).toBe(0);
  });
});
