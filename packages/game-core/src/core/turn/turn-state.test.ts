import { describe, expect, it } from "vitest";
import type { PlayerId } from "@genesis-rift/shared";

import { advanceTurnState, createTurnState, removePlayerFromTurnState } from "./turn-state.ts";

const PLAYER_ONE = "player-one" as PlayerId;
const PLAYER_TWO = "player-two" as PlayerId;
const PLAYER_THREE = "player-three" as PlayerId;

describe("turn state", () => {
  it("starts the first player at the first round", () => {
    expect(createTurnState({ playerOrder: [PLAYER_ONE, PLAYER_TWO] })).toEqual({
      globalTurn: 0,
      round: 1,
      activePlayerId: PLAYER_ONE,
      phase: "turnStart",
    });
  });

  it("advances global player turns and starts a new round after the last player", () => {
    const initial = createTurnState({ playerOrder: [PLAYER_ONE, PLAYER_TWO] });
    const secondTurn = advanceTurnState(initial, [PLAYER_ONE, PLAYER_TWO]);
    const nextRound = advanceTurnState(secondTurn, [PLAYER_ONE, PLAYER_TWO]);

    expect(secondTurn).toMatchObject({ globalTurn: 1, round: 1, activePlayerId: PLAYER_TWO });
    expect(nextRound).toMatchObject({ globalTurn: 2, round: 2, activePlayerId: PLAYER_ONE });
  });

  it("skips unavailable players without adding extra global turns", () => {
    const initial = createTurnState({ playerOrder: [PLAYER_ONE, PLAYER_TWO, PLAYER_THREE] });
    const nextTurn = advanceTurnState(initial, [PLAYER_ONE, PLAYER_TWO, PLAYER_THREE], {
      unavailablePlayerIds: [PLAYER_TWO],
    });

    expect(nextTurn).toMatchObject({ globalTurn: 1, activePlayerId: PLAYER_THREE });
  });

  it("moves the active turn to the next available player after removal", () => {
    const state = {
      globalTurn: 4,
      round: 2,
      activePlayerId: PLAYER_TWO,
      phase: "mainAction",
    } as const;

    expect(
      removePlayerFromTurnState(
        state,
        [PLAYER_ONE, PLAYER_TWO, PLAYER_THREE],
        [PLAYER_ONE, PLAYER_THREE],
        PLAYER_TWO,
      ),
    ).toMatchObject({ activePlayerId: PLAYER_THREE, phase: "turnStart" });
  });
});
