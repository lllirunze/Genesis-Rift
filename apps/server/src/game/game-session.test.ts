import { describe, expect, it } from "vitest";
import {
  applyStatusToCharacter,
  applyWeather,
  createPlayerExplorationState,
  evaluateNormalMovementDirections,
  getCubeCoordinateDistance,
  HEX_DIRECTIONS,
  receiveItem,
  type GameSessionState,
  type GameSessionValidationContext,
} from "@genesis-rift/game-core";
import {
  MAP_CONTENT_DEFINITION_CATALOG,
  WEATHER_DEFINITION_CATALOG,
} from "@genesis-rift/game-data";
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

    expect(session.getSnapshot().players).toMatchObject([
      {
        playerId: PLAYER_ONE,
        gender: "female",
        identityId: "identity.mage",
        raceId: "race.human",
        currentTileId: "tile:1",
        survivalStatus: null,
      },
      {
        playerId: PLAYER_TWO,
        gender: "female",
        identityId: "identity.ranger",
        raceId: "race.yokai",
        currentTileId: "tile:2",
        survivalStatus: null,
      },
    ]);
    expect(session.getSnapshot().viewer).toBeNull();
  });

  it("projects private inventory and hand data only for the viewing player", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-private-view",
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
    const itemDefinitions = {
      item_000002: {
        definitionId: "item_000002",
        name: "Linen Cloth",
        category: "material",
        quality: "common",
        width: 1,
        height: 1,
        maximumStack: 5,
      },
    } as const;
    const validationContext = { ...initial.validationContext, itemDefinitions };
    const inventory = receiveItem(
      firstPlayer.inventory,
      {
        definitionId: "item_000002",
        quantity: 1,
        sourceId: "test.private-view",
        newItemInstanceIds: ["item-instance-private-001"],
      },
      itemDefinitions,
    ).inventory;
    const session = new ServerGameSession(
      {
        ...initial.state,
        players: [{ ...firstPlayer, inventory }, initial.state.players[1]!],
      },
      validationContext,
    );

    const firstView = session.getSnapshotForPlayer(PLAYER_ONE);
    const secondView = session.getSnapshotForPlayer(PLAYER_TWO);

    expect(firstView.viewer).toMatchObject({
      playerId: PLAYER_ONE,
      character: {
        level: 1,
        experience: 0,
        currentPrimaryAttributes: expect.any(Object),
        effectivePrimaryAttributes: expect.any(Object),
        derivedAttributes: expect.any(Object),
        resources: {
          health: expect.objectContaining({ current: expect.any(Number) }),
        },
        statuses: [],
      },
      inventory: {
        backpack: {
          entries: [
            {
              instanceId: "item-instance-private-001",
              definitionId: "item_000002",
              quantity: 1,
            },
          ],
        },
      },
      handCardIds: expect.any(Array),
      map: {
        tiles: [
          expect.objectContaining({
            isCurrentPlayerTile: true,
            terrainDefinitionId: expect.stringMatching(/^terrain_00000[1-6]$/),
          }),
        ],
      },
    });
    expect(secondView.viewer?.playerId).toBe(PLAYER_TWO);
    expect(secondView.viewer?.character).toMatchObject({
      level: 1,
      resources: { health: expect.any(Object) },
    });
    expect(secondView.viewer?.inventory.backpack.entries).toEqual([]);
    expect(JSON.stringify(secondView)).not.toContain("item-instance-private-001");
    expect(secondView.viewer?.handCardIds).not.toContain(firstView.viewer?.handCardIds[0]);
    expect(secondView.players[0]?.backpack.occupiedCells).not.toHaveLength(0);
    expect(JSON.stringify(firstView.players)).not.toContain("derivedAttributes");
    expect(JSON.stringify(firstView.players)).not.toContain("currentPrimaryAttributes");
    expect(JSON.stringify(session.getSnapshot())).not.toContain("terrainDefinitionId");
  });

  it("creates an optional private event after first exploring the ancient ruins", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-exploration-event",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const map = initial.state.world.map;
    const neighbor = map.getTileAt({ x: 0, y: 1, z: -1 });

    if (neighbor === undefined) {
      throw new Error("Missing ancient ruins neighbor tile");
    }

    const player = initial.state.players[0]!;
    const session = new ServerGameSession(
      {
        ...initial.state,
        players: [
          {
            ...player,
            map: {
              currentTileId: neighbor.tileId,
              exploration: createPlayerExplorationState(PLAYER_ONE, neighbor.tileId, map),
            },
          },
        ],
      },
      initial.validationContext,
      () => 10,
    );
    session.start();
    session.moveActivePlayer(PLAYER_ONE, "SOUTH");

    expect(session.getSnapshotForPlayer(PLAYER_ONE).viewer?.activeEvent).toMatchObject({
      status: "PENDING_REVEAL",
      revealMode: "OPTIONAL",
      allowedRevealActions: ["REVEAL", "DECLINE"],
      content: null,
    });
    expect(JSON.stringify(session.getSnapshot())).not.toContain("Ancient Ruins");
  });

  it("reveals and resolves an optional exploration event through the active player commands", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-exploration-event-resolution",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const map = initial.state.world.map;
    const neighbor = map.getTileAt({ x: 0, y: 1, z: -1 });

    if (neighbor === undefined) {
      throw new Error("Missing ancient ruins neighbor tile");
    }

    const player = initial.state.players[0]!;
    const session = new ServerGameSession(
      {
        ...initial.state,
        players: [
          {
            ...player,
            map: {
              currentTileId: neighbor.tileId,
              exploration: createPlayerExplorationState(PLAYER_ONE, neighbor.tileId, map),
            },
          },
        ],
      },
      initial.validationContext,
      () => 10,
    );
    session.start();
    session.moveActivePlayer(PLAYER_ONE, "SOUTH");
    const instanceId = session.getSnapshotForPlayer(PLAYER_ONE).viewer?.activeEvent?.instanceId;

    if (instanceId === undefined) {
      throw new Error("Expected optional ancient ruins event");
    }

    session.decideActivePlayerEventReveal(PLAYER_ONE, instanceId, "REVEAL");

    expect(session.getSnapshotForPlayer(PLAYER_ONE).viewer?.activeEvent).toMatchObject({
      status: "REVEALED",
      content: {
        eventId: "event_000003",
        options: [
          { optionId: "studyTablet", isAvailable: true },
          { optionId: "collectRelics", isAvailable: true },
        ],
      },
    });

    session.selectActivePlayerEventOption(PLAYER_ONE, instanceId, "studyTablet");

    expect(session.getSnapshotForPlayer(PLAYER_ONE).viewer?.activeEvent).toBeNull();
    expect(session.getStateForServer().players[0]?.inventory.backpack.entries).toEqual([
      expect.objectContaining({
        item: expect.objectContaining({
          definitionId: expect.stringMatching(/^item_00001[2-4]$/),
        }),
      }),
    ]);
  });

  it("updates backpack layout and equipped slots through authority session item operations", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-item-operations",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const player = initial.state.players[0]!;
    const inventoryWithPotion = receiveItem(
      player.inventory,
      {
        definitionId: "item_000005",
        quantity: 1,
        sourceId: "test.item-operations",
        newItemInstanceIds: ["item-instance-potion-001"],
      },
      initial.validationContext.itemDefinitions,
    ).inventory;
    const inventory = receiveItem(
      inventoryWithPotion,
      {
        definitionId: "equip_000002",
        quantity: 1,
        sourceId: "test.item-operations",
        newItemInstanceIds: ["item-instance-sword-001"],
      },
      initial.validationContext.itemDefinitions,
    ).inventory;
    const session = new ServerGameSession(
      { ...initial.state, players: [{ ...player, inventory }] },
      initial.validationContext,
    );
    session.start();

    session.moveInventoryItem(PLAYER_ONE, "item-instance-potion-001", { x: 3, y: 0 });
    session.equipInventoryItem(PLAYER_ONE, "item-instance-sword-001", "weapon");
    const snapshot = session.getSnapshotForPlayer(PLAYER_ONE);

    expect(snapshot.players[0]?.equipment.weapon).toBe("equip_000002");
    expect(snapshot.viewer?.inventory.backpack.entries).toEqual([
      expect.objectContaining({
        instanceId: "item-instance-potion-001",
        position: { x: 3, y: 0 },
      }),
    ]);
  });

  it("uses a configured consumable by atomically updating health and inventory", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-use-consumable",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const player = initial.state.players[0]!;
    const inventory = receiveItem(
      player.inventory,
      {
        definitionId: "item_000005",
        quantity: 1,
        sourceId: "test.use-consumable",
        newItemInstanceIds: ["item-instance-potion-002"],
      },
      initial.validationContext.itemDefinitions,
    ).inventory;
    const resources = {
      ...player.resources,
      resources: {
        ...player.resources.resources,
        health: { ...player.resources.resources.health, current: 1 },
      },
    };
    const session = new ServerGameSession(
      { ...initial.state, players: [{ ...player, inventory, resources }] },
      initial.validationContext,
    );
    session.start();

    session.useConsumableItem(PLAYER_ONE, "item_000005");
    const updated = session.getStateForServer().players[0]!;

    expect(updated.resources.resources.health.current).toBe(26);
    expect(updated.inventory.backpack.entries).toEqual([]);
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
    const session = new ServerGameSession(initial.state, initial.validationContext, () => 10);
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

  it("limits downed movement and converts a downed player to dead after own turn countdown", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-downed-lifecycle",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const player = initial.state.players[0]!;
    const state = {
      ...initial.state,
      players: [
        {
          ...player,
          battle: {
            ...player.battle,
            survival: {
              participantId: PLAYER_ONE,
              status: "DOWNED" as const,
              downedTurnsRemaining: 2,
            },
          },
        },
      ],
    };
    const session = new ServerGameSession(state, initial.validationContext);
    session.start();

    expect(session.getSnapshot().turn.remainingMovementPoints).toBe(1);

    const firstTurnEnd = session.endActivePlayerTurn(PLAYER_ONE);

    expect(firstTurnEnd.events[0]).toMatchObject({
      type: "player.survivalChanged",
      playerId: PLAYER_ONE,
      status: "DOWNED",
      downedTurnsRemaining: 1,
    });
    expect(session.getStateForServer().players[0]!.battle.survival).toMatchObject({
      status: "DOWNED",
      downedTurnsRemaining: 1,
    });

    const secondTurnEnd = session.endActivePlayerTurn(PLAYER_ONE);

    expect(secondTurnEnd.events[0]).toMatchObject({
      type: "player.survivalChanged",
      playerId: PLAYER_ONE,
      status: "DEAD",
      downedTurnsRemaining: 0,
    });
    expect(secondTurnEnd.snapshot.players[0]).toMatchObject({ survivalStatus: "DEAD" });
    expect(secondTurnEnd.snapshot.turn.remainingMovementPoints).toBe(0);
  });

  it("creates a waiting soul after death and opens reincarnation after three owner turns", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-soul-wait",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const player = initial.state.players[0]!;
    const session = new ServerGameSession(
      {
        ...initial.state,
        players: [
          {
            ...player,
            battle: {
              ...player.battle,
              survival: {
                ...player.battle.survival,
                status: "DOWNED" as const,
                downedTurnsRemaining: 1,
              },
            },
          },
        ],
      },
      initial.validationContext,
    );
    session.start();

    session.endActivePlayerTurn(PLAYER_ONE);
    expect(session.getStateForServer().players[0]!.revival.soul).toMatchObject({
      status: "WAITING",
      remainingWaitTurns: 3,
    });

    session.endActivePlayerTurn(PLAYER_ONE);
    session.endActivePlayerTurn(PLAYER_ONE);
    session.endActivePlayerTurn(PLAYER_ONE);
    expect(session.getStateForServer().players[0]!.revival.soul).toMatchObject({
      status: "READY",
      remainingWaitTurns: 0,
    });
  });

  it("reincarnates a ready soul at a safe tile and grants three-turn protection", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-reincarnation-success",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
      ],
    });
    const player = initial.state.players[0]!;
    const session = new ServerGameSession(
      {
        ...initial.state,
        players: [
          {
            ...player,
            resources: {
              ...player.resources,
              resources: {
                health: { ...player.resources.resources.health, current: 0 },
              },
            },
            battle: {
              ...player.battle,
              survival: { ...player.battle.survival, status: "DEAD" as const },
            },
            revival: {
              soul: {
                participantId: PLAYER_ONE,
                status: "READY" as const,
                remainingWaitTurns: 0,
                failedAttemptCount: 5,
                lastAttemptTurn: null,
              },
              protection: null,
              isMidGameJoin: false,
            },
          },
        ],
      },
      initial.validationContext,
    );
    session.start();

    const result = session.attemptActivePlayerReincarnation(PLAYER_ONE);
    const reincarnated = session.getStateForServer().players[0]!;
    const spawnTile = session
      .getStateForServer()
      .world.map.getTileById(reincarnated.map.currentTileId)!;

    expect(result.events[0]).toMatchObject({
      type: "player.reincarnationResolved",
      outcome: "SUCCEEDED",
      protectionTurns: 3,
    });
    expect(reincarnated.battle.survival.status).toBe("ACTIVE");
    expect(reincarnated.resources.resources.health.current).toBeGreaterThan(0);
    expect(reincarnated.revival).toMatchObject({ soul: null, protection: { remainingTurns: 3 } });
    expect(
      MAP_CONTENT_DEFINITION_CATALOG.regions[spawnTile.regionDefinitionId as "region_000002"]?.tags,
    ).toContain("safe-area");
  });

  it("rejects attacks against a player protected by reincarnation", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-reincarnation-protection",
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
    const session = new ServerGameSession(
      {
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
            map: {
              currentTileId: defenderTile.tileId,
              exploration: { ...defender.map.exploration, exploredTileIds: [defenderTile.tileId] },
            },
            revival: {
              soul: null,
              protection: { participantId: PLAYER_TWO, remainingTurns: 3 },
              isMidGameJoin: false,
            },
          },
        ],
      },
      initial.validationContext,
    );
    session.start();

    expect(() => session.attackActivePlayer(PLAYER_ONE, PLAYER_TWO)).toThrow(
      ServerGameSessionError,
    );
  });

  it("adds a mid-game player through the reincarnation entry and activates them after success", () => {
    const initial = new DefaultInitialGameSessionFactory().create({
      roomId: "room-mid-game-join",
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
    session.addMidGamePlayer({
      playerId: PLAYER_TWO,
      characterSelection: { gender: "male", identityName: "ranger", raceName: "yokai" },
    });

    expect(session.getStateForServer().players[1]!.revival).toMatchObject({
      soul: { status: "READY" },
      isMidGameJoin: true,
    });

    session.endActivePlayerTurn(PLAYER_ONE);
    let result: ReturnType<
      ServerGameSession<"health", "maxHealth">["attemptActivePlayerReincarnation"]
    > | null = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      result = session.attemptActivePlayerReincarnation(PLAYER_TWO);

      if (
        result.events[0]?.type === "player.reincarnationResolved" &&
        result.events[0].outcome === "SUCCEEDED"
      ) {
        break;
      }

      session.endActivePlayerTurn(PLAYER_TWO);
      session.endActivePlayerTurn(PLAYER_ONE);
    }

    const joined = session
      .getStateForServer()
      .players.find((player) => player.playerId === PLAYER_TWO)!;

    expect(result?.events[0]).toMatchObject({
      type: "player.reincarnationResolved",
      outcome: "SUCCEEDED",
      protectionTurns: 3,
    });
    expect(joined.battle.survival.status).toBe("ACTIVE");
    expect(joined.resources.resources.health.current).toBe(
      joined.resources.resources.health.maximum,
    );
    expect(joined.hand.handCardIds).toHaveLength(2);
    expect(joined.revival).toMatchObject({
      isMidGameJoin: false,
      protection: { remainingTurns: 3 },
    });
    expect(session.getSnapshot().turn.remainingMovementPoints).toBe(0);
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
