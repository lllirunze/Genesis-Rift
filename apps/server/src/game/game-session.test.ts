import { describe, expect, it } from "vitest";
import {
  evaluateNormalMovementDirections,
  HEX_DIRECTIONS,
  type GameSessionState,
  type GameSessionValidationContext,
} from "@genesis-rift/game-core";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import { ServerGameSession, ServerGameSessionError } from "./game-session.ts";
import { DefaultInitialGameSessionFactory } from "./default-initial-game-session-factory.ts";

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
    players: [
      createPlayerSessionState(PLAYER_ONE, "tile:1"),
      createPlayerSessionState(PLAYER_TWO, "tile:2"),
    ],
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

  it("publishes only the selected identity and current position needed by the game interface", () => {
    const session = new ServerGameSession(createSessionState(), createValidationContext());

    expect(session.getSnapshot().players).toEqual([
      {
        playerId: PLAYER_ONE,
        gender: "female",
        identityId: "identity.mage",
        raceId: "race.human",
        currentTileId: "tile:1",
      },
      {
        playerId: PLAYER_TWO,
        gender: "female",
        identityId: "identity.ranger",
        raceId: "race.yokai",
        currentTileId: "tile:2",
      },
    ]);
  });

  it("settles one normal move through the authority session and records first exploration", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-map-move",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const session = new ServerGameSession(initial.state, initial.validationContext);
    session.start();
    const initialPlayer = session.getStateForServer().players[0]!;
    const initialTile = session
      .getStateForServer()
      .world.map.getTileById(initialPlayer.map.currentTileId)!;
    const direction = HEX_DIRECTIONS.find(
      (candidate) =>
        evaluateNormalMovementDirections(
          session.getStateForServer().world.map,
          initialTile.coordinate,
        ).find((evaluation) => evaluation.direction === candidate)?.available === true,
    );

    expect(direction).toBeDefined();

    const result = session.moveActivePlayer(PLAYER_ONE, direction!);
    const movedPlayer = session.getStateForServer().players[0]!;

    expect(movedPlayer.map.currentTileId).not.toBe(initialTile.tileId);
    expect(movedPlayer.map.exploration.exploredTileIds).toContain(movedPlayer.map.currentTileId);
    expect(result.snapshot.turn.remainingMovementPoints).toBe(0);
    expect(result.events[0]).toMatchObject({ type: "player.moved", playerId: PLAYER_ONE });
  });
});

/** 创建仅供公开快照测试读取的最小玩家运行时状态。 */
function createPlayerSessionState(playerId: PlayerId, currentTileId: string) {
  return {
    playerId,
    character: {
      playerId,
      gender: "female",
      identityId: playerId === PLAYER_ONE ? "identity.mage" : "identity.ranger",
      raceId: playerId === PLAYER_ONE ? "race.human" : "race.yokai",
    },
    map: { currentTileId },
  };
}
