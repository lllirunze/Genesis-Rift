import { describe, expect, it } from "vitest";
import {
  applyStatusToCharacter,
  applyWeather,
  evaluateNormalMovementDirections,
  getCubeCoordinateDistance,
  HEX_DIRECTIONS,
  type GameSessionState,
  type GameSessionValidationContext,
} from "@genesis-rift/game-core";
import { WEATHER_DEFINITION_CATALOG } from "@genesis-rift/game-data";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import { ServerGameSession, ServerGameSessionError } from "./game-session.ts";
import { DefaultInitialGameSessionFactory } from "./default-initial-game-session-factory.ts";

const GAME_ID = "game_000001" as GameId;
const PLAYER_ONE = "player-one" as PlayerId;
const PLAYER_TWO = "player-two" as PlayerId;

/** 创建仅用于服务端回合编排测试的最小会话壳状态。 */
function createSessionState(): GameSessionState {
  return {
    version: 4,
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

  it("applies active weather movement cost before accepting a map move", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-weather-move",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const blizzard = WEATHER_DEFINITION_CATALOG.weather_000004!;
    const state = {
      ...initial.state,
      world: {
        ...initial.state.world,
        environment: {
          ...initial.state.world.environment,
          weather: applyWeather(initial.state.world.environment.weather, blizzard, {
            instanceId: "weather-instance-001",
            sourceType: "SYSTEM",
            sourceId: "test.weather",
            startedRound: 1,
          }),
        },
      },
    };
    const session = new ServerGameSession(state, initial.validationContext);
    session.start();
    const player = session.getStateForServer().players[0]!;
    const tile = session.getStateForServer().world.map.getTileById(player.map.currentTileId)!;
    const direction = evaluateNormalMovementDirections(
      session.getStateForServer().world.map,
      tile.coordinate,
    ).find((evaluation) => evaluation.available)?.direction;

    expect(direction).toBeDefined();
    expect(() => session.moveActivePlayer(PLAYER_ONE, direction!)).toThrow(ServerGameSessionError);
    expect(session.getStateForServer().players[0]!.map.currentTileId).toBe(tile.tileId);
  });

  it("settles one adjacent normal attack through the authority session", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-normal-attack",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
        {
          playerId: PLAYER_TWO,
          displayName: "Player Two",
          characterSelection: { gender: "male", identityName: "ranger", raceName: "yokai" },
        },
      ],
    });
    const attacker = initial.state.players[0]!;
    const defender = initial.state.players[1]!;
    const attackerTile = initial.state.world.map.getTileById(attacker.map.currentTileId)!;
    const defenderTile = initial.state.world.map.tiles.find(
      (tile) => getCubeCoordinateDistance(attackerTile.coordinate, tile.coordinate) === 1,
    )!;
    const state = {
      ...initial.state,
      players: [
        {
          ...attacker,
          map: {
            currentTileId: attackerTile.tileId,
            exploration: {
              ...attacker.map.exploration,
              exploredTileIds: [...attacker.map.exploration.exploredTileIds, defenderTile.tileId],
            },
          },
        },
        {
          ...defender,
          character: {
            ...defender.character,
            currentPrimaryAttributes: {
              strength: 0,
              constitution: 0,
              spirit: 0,
              agility: 0,
              insight: 0,
            },
          },
          map: {
            currentTileId: defenderTile.tileId,
            exploration: { ...defender.map.exploration, exploredTileIds: [defenderTile.tileId] },
          },
        },
      ],
    };
    const session = new ServerGameSession(state, initial.validationContext);
    session.start();
    const healthBefore = session.getStateForServer().players[1]!.resources.resources.health.current;

    const result = session.attackActivePlayer(PLAYER_ONE, PLAYER_TWO);
    const defenderAfter = session.getStateForServer().players[1]!;

    expect(result.events[0]).toMatchObject({
      type: "battle.attackResolved",
      attackerId: PLAYER_ONE,
      defenderId: PLAYER_TWO,
      outcome: "RESOLVED",
    });
    expect(defenderAfter.resources.resources.health.current).toBeLessThan(healthBefore);
    expect(result.snapshot.turn.remainingMovementPoints).toBe(0);
    expect(() => session.attackActivePlayer(PLAYER_ONE, PLAYER_TWO)).toThrow(
      ServerGameSessionError,
    );
  });

  it("advances public environment state only when a complete player round ends", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-environment-round",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
        {
          playerId: PLAYER_TWO,
          displayName: "Player Two",
          characterSelection: { gender: "male", identityName: "ranger", raceName: "yokai" },
        },
      ],
    });
    const session = new ServerGameSession(initial.state, initial.validationContext);
    session.start();

    expect(session.getSnapshot().environment).toMatchObject({
      currentRound: 1,
      dayNight: { periodId: "day" },
      activeWeatherIds: [],
      activeDisaster: null,
    });

    session.endActivePlayerTurn(PLAYER_ONE);
    const secondRound = session.endActivePlayerTurn(PLAYER_TWO).snapshot;

    expect(secondRound.environment).toMatchObject({ currentRound: 2, activeWeatherIds: [] });

    session.endActivePlayerTurn(PLAYER_ONE);
    const thirdRound = session.endActivePlayerTurn(PLAYER_TWO).snapshot;
    const environment = thirdRound.environment!;

    expect(environment.currentRound).toBe(3);
    expect(environment.activeWeatherIds.length + Number(environment.activeDisaster !== null)).toBe(
      1,
    );
  });

  it("advances only the ending player's statuses and removes them when their duration expires", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-status-turn-end",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
        {
          playerId: PLAYER_TWO,
          displayName: "Player Two",
          characterSelection: { gender: "male", identityName: "ranger", raceName: "yokai" },
        },
      ],
    });
    const firstPlayer = initial.state.players[0]!;
    const secondPlayer = initial.state.players[1]!;
    const firstPlayerStatus = applyStatusToCharacter(
      firstPlayer.statuses,
      initial.validationContext.statusDefinitions,
      {
        definitionId: "buff_000001",
        newInstanceId: "buff-instance-001",
        sourceId: "test.status",
        createdAtSequence: 1,
      },
    ).state;
    const secondPlayerStatus = applyStatusToCharacter(
      secondPlayer.statuses,
      initial.validationContext.statusDefinitions,
      {
        definitionId: "buff_000001",
        newInstanceId: "buff-instance-002",
        sourceId: "test.status",
        createdAtSequence: 2,
      },
    ).state;
    const withStatuses = {
      ...initial.state,
      players: [
        { ...firstPlayer, statuses: firstPlayerStatus },
        { ...secondPlayer, statuses: secondPlayerStatus },
      ],
    };
    const session = new ServerGameSession(withStatuses, initial.validationContext);
    session.start();

    session.endActivePlayerTurn(PLAYER_ONE);

    expect(session.getStateForServer().players[0]!.statuses.instances).toMatchObject([
      { definitionId: "buff_000001", remainingTurns: 1 },
    ]);
    expect(session.getStateForServer().players[1]!.statuses.instances).toMatchObject([
      { definitionId: "buff_000001", remainingTurns: 2 },
    ]);

    session.endActivePlayerTurn(PLAYER_TWO);
    session.endActivePlayerTurn(PLAYER_ONE);

    expect(session.getStateForServer().players[0]!.statuses.instances).toEqual([]);
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
