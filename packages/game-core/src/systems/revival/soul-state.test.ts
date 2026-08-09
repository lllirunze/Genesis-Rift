import { describe, expect, it } from "vitest";

import type { CharacterSurvivalState } from "../battle/survival/index.ts";

import {
  advanceSoulWaitAtOwnerTurnEnd,
  createSoulStateForMidGameJoin,
  createSoulStateFromDeath,
} from "./soul-state.ts";

describe("soul wait state", () => {
  it("仅允许正式死亡角色进入灵魂等待状态", () => {
    expect(() => createSoulStateFromDeath(createSurvivalState("DOWNED"))).toThrow(
      "dead characters",
    );
    expect(createSoulStateFromDeath(createSurvivalState("DEAD"))).toEqual({
      participantId: "player_a",
      status: "WAITING",
      remainingWaitTurns: 3,
      failedAttemptCount: 0,
      lastAttemptTurn: null,
    });
  });

  it("在所属玩家三个回合结束后开放轮回申请", () => {
    let state = createSoulStateFromDeath(createSurvivalState("DEAD"));

    state = advanceSoulWaitAtOwnerTurnEnd(state).state;
    expect(state).toMatchObject({ status: "WAITING", remainingWaitTurns: 2 });
    state = advanceSoulWaitAtOwnerTurnEnd(state).state;
    const ready = advanceSoulWaitAtOwnerTurnEnd(state);

    expect(ready).toEqual({
      outcome: "READY_FOR_REINCARNATION",
      state: {
        participantId: "player_a",
        status: "READY",
        remainingWaitTurns: 0,
        failedAttemptCount: 0,
        lastAttemptTurn: null,
      },
    });
    expect(advanceSoulWaitAtOwnerTurnEnd(ready.state).outcome).toBe("NOT_WAITING");
  });

  it("中途加入者跳过死亡等待并直接进入可申请轮回状态", () => {
    expect(createSoulStateForMidGameJoin("player_b")).toEqual({
      participantId: "player_b",
      status: "READY",
      remainingWaitTurns: 0,
      failedAttemptCount: 0,
      lastAttemptTurn: null,
    });
  });
});

/** 创建仅包含灵魂状态转换所需字段的角色生存状态。 */
function createSurvivalState(status: "DOWNED" | "DEAD"): CharacterSurvivalState {
  return {
    participantId: "player_a",
    status,
    downedTurnsRemaining: status === "DOWNED" ? 1 : 0,
  };
}
