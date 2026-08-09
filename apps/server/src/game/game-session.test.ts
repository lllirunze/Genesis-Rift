import { describe, expect, it } from "vitest";
import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import { ServerGameSession, ServerGameSessionError } from "./game-session.ts";

const GAME_ID = "game_000001" as GameId;
const PLAYER_ONE = "player-one" as PlayerId;
const PLAYER_TWO = "player-two" as PlayerId;

/** 创建仅用于服务端回合编排测试的最小会话壳状态。 */
function createSessionState(): GameSessionState {
  return {
    version: 2,
    gameId: GAME_ID,
    status: "lobby",
    playerOrder: [PLAYER_ONE, PLAYER_TWO],
    players: [{ playerId: PLAYER_ONE }, { playerId: PLAYER_TWO }],
    world: {},
    random: {},
  } as unknown as GameSessionState;
}

/** 创建本测试不触发深度状态校验时使用的静态定义上下文。 */
function createValidationContext(): GameSessionValidationContext {
  return {} as GameSessionValidationContext;
}

describe("ServerGameSession", () => {
  it("starts a lobby and advances only the active connected player turn", () => {
    const session = new ServerGameSession(createSessionState(), createValidationContext());
    session.start();
    const result = session.endActivePlayerTurn(PLAYER_ONE);

    expect(result.snapshot.status).toBe("running");
    expect(result.snapshot.turn).toMatchObject({ globalTurn: 1, activePlayerId: PLAYER_TWO });
    expect(() => session.endActivePlayerTurn(PLAYER_ONE)).toThrow(ServerGameSessionError);
  });

  it("records a ten global turn recovery deadline and restores the original player", () => {
    const session = new ServerGameSession(createSessionState(), createValidationContext());
    session.start();
    const disconnected = session.markPlayerDisconnected(PLAYER_TWO);

    expect(disconnected.snapshot.disconnectedPlayers).toEqual([
      {
        playerId: PLAYER_TWO,
        expiresAfterGlobalTurn: 10,
      },
    ]);

    const restored = session.restorePlayerConnection(PLAYER_TWO);

    expect(restored.events).toEqual([
      { type: "player.reconnected", gameId: GAME_ID, playerId: PLAYER_TWO },
    ]);
    expect(restored.snapshot.disconnectedPlayers).toEqual([]);
  });

  it("skips a disconnected active player without counting an unfinished turn", () => {
    const session = new ServerGameSession(createSessionState(), createValidationContext());
    session.start();
    session.markPlayerDisconnected(PLAYER_ONE);

    expect(session.getSnapshot().turn).toMatchObject({ globalTurn: 0, activePlayerId: PLAYER_TWO });
  });
});
