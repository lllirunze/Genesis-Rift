import { describe, expect, it } from "vitest";
import type { GameId, PlayerId, TileId } from "@genesis-rift/shared";

import {
  addPlayerSessionState,
  createGameSessionState,
  getPlayerSessionState,
  replacePlayerSessionState,
  type GameSessionState,
  type GameSessionValidationContext,
  type PlayerSessionState,
  type WorldSessionState,
} from "./game-session-state.ts";
import { createCharacterResourceState } from "../../systems/character/character-resource-state.ts";
import { createCharacterStatusState } from "../../systems/battle/status/character-status-state.ts";
import { createPlayerInventory } from "../../systems/inventory/player-inventory-state.ts";
import { createEmptyEquipmentLoadout } from "../../systems/equipment/equipment-loadout.ts";
import { createHandCardDeckState } from "../../systems/hand/hand-card-deck-state.ts";
import { createPlayerHandState } from "../../systems/hand/player-hand-state.ts";
import { createPlayerExplorationState } from "../../systems/map/exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../../systems/map/generation/generate-base-map-coordinates.ts";
import { HexMap } from "../../systems/map/model/hex-map.ts";
import { createHexTile } from "../../systems/map/model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../../systems/map/model/map-content-definition-catalog.ts";
import { createWeatherDeck } from "../../systems/environment/weather/weather-deck.ts";
import { createWeatherRuntimeState } from "../../systems/environment/weather/weather-runtime-state.ts";
import { RandomManager } from "../../systems/random/core/random-manager.ts";
import { createMasterSeed } from "../../systems/random/core/random-seed.ts";

const GAME_ID = "game-session-test" as GameId;
const PLAYER_ONE_ID = "player-one" as PlayerId;
const PLAYER_TWO_ID = "player-two" as PlayerId;

/** 测试地图使用的最小地形与区域定义。 */
const MAP_DEFINITIONS = {
  terrains: {
    terrain_000001: {
      definitionId: "terrain_000001",
      name: "Plain",
      tags: [],
      movementCostModifier: 0,
    },
  },
  regions: {
    region_000001: {
      definitionId: "region_000001",
      name: "Wilderness",
      category: "wilderness",
      tags: [],
    },
  },
} as const satisfies MapContentDefinitionCatalog;

/** 测试角色仅启用生命值这一项运行时资源。 */
const RESOURCE_DEFINITIONS = {
  health: {
    resourceId: "health",
    maximumDerivedAttribute: "maxHealth",
    minimum: 0,
    initialValue: { kind: "maximum" },
  },
} as const;

/**
 * 方法名：createTestMap
 * 作用：创建包含完整十环坐标的合法六边形测试地图。
 * @returns 可用于会话深度校验的六边形地图。
 */
function createTestMap(): HexMap {
  const tiles = generateBaseMapCoordinates().map((coordinate, index) =>
    createHexTile(
      {
        tileId: `tile-${index}` as TileId,
        coordinate,
        elevation: 0,
        terrainDefinitionId: "terrain_000001",
        regionDefinitionId: "region_000001",
        passability: "passable",
      },
      MAP_DEFINITIONS,
    ),
  );

  return HexMap.create(tiles, MAP_DEFINITIONS);
}

/**
 * 方法名：createWorldState
 * 作用：创建共享地图、空手牌牌库与完整天气牌库测试状态。
 * @returns 世界状态及产生该状态的随机管理器。
 */
function createWorldState(): { readonly world: WorldSessionState; readonly random: RandomManager } {
  const map = createTestMap();
  const random = RandomManager.create(createMasterSeed("11".repeat(32)));

  return {
    world: {
      map,
      handCardDeck: createHandCardDeckState("shared-deck", [], {}),
      weatherDeck: createWeatherDeck(random.getStream("weather")),
      weather: createWeatherRuntimeState(),
    },
    random,
  };
}

/**
 * 方法名：createValidationContext
 * 作用：创建会话测试所需的最小静态定义集合。
 * @returns 能够校验空物品、空装备、空手牌和空状态配置的上下文。
 */
function createValidationContext(): GameSessionValidationContext<"health", "maxHealth"> {
  return {
    characterResourceDefinitions: RESOURCE_DEFINITIONS,
    itemDefinitions: {},
    equipmentDefinitions: [],
    handCardCatalog: {},
    statusDefinitions: {},
    weatherDefinitions: {},
    weatherDisasterDefinitions: {},
  };
}

/**
 * 方法名：createPlayerState
 * 作用：为指定玩家创建归属一致且位于地图中心的完整会话状态。
 * @param playerId 需要创建状态的玩家标识。
 * @param world 玩家所在的共享世界状态。
 * @returns 可直接加入游戏会话的完整玩家状态。
 */
function createPlayerState(
  playerId: PlayerId,
  world: WorldSessionState,
): PlayerSessionState<"health"> {
  const spawnTile = world.map.getTileAt({ x: 0, y: 0, z: 0 });

  if (spawnTile === undefined) {
    throw new Error("Test map is missing its center tile");
  }

  return {
    playerId,
    character: {
      playerId,
      identityId: "identity.mage",
      raceId: "race.human",
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      attributeModifiers: [],
      levelProgression: { currentLevel: 1, currentExperience: 0 },
    },
    resources: createCharacterResourceState(playerId, RESOURCE_DEFINITIONS, { maxHealth: 90 }),
    statuses: createCharacterStatusState(playerId),
    inventory: createPlayerInventory(playerId),
    equipment: createEmptyEquipmentLoadout(playerId),
    hand: createPlayerHandState(playerId),
    map: {
      currentTileId: spawnTile.tileId,
      exploration: createPlayerExplorationState(playerId, spawnTile.tileId, world.map),
    },
  };
}

/**
 * 方法名：createEmptySession
 * 作用：创建没有玩家但世界与随机状态完整的大厅会话。
 * @returns 空会话、校验上下文和世界状态。
 */
function createEmptySession(): {
  readonly state: GameSessionState<"health">;
  readonly context: GameSessionValidationContext<"health", "maxHealth">;
  readonly world: WorldSessionState;
} {
  const { world, random } = createWorldState();
  const context = createValidationContext();
  const state = createGameSessionState(
    { gameId: GAME_ID, world, random: random.exportState() },
    context,
  );

  return { state, context, world };
}

describe("game session state", () => {
  it("creates a valid empty lobby session", () => {
    const { state } = createEmptySession();

    expect(state).toMatchObject({
      version: 2,
      gameId: GAME_ID,
      status: "lobby",
      playerOrder: [],
      players: [],
    });
  });

  it("adds and retrieves a complete player state without mutating the previous session", () => {
    const { state, context, world } = createEmptySession();
    const player = createPlayerState(PLAYER_ONE_ID, world);
    const nextState = addPlayerSessionState(state, player, context);

    expect(state.players).toHaveLength(0);
    expect(nextState.playerOrder).toEqual([PLAYER_ONE_ID]);
    expect(getPlayerSessionState(nextState, PLAYER_ONE_ID)).toBe(player);
  });

  it("replaces one player while preserving order and other player references", () => {
    const { state, context, world } = createEmptySession();
    const firstPlayer = createPlayerState(PLAYER_ONE_ID, world);
    const secondPlayer = createPlayerState(PLAYER_TWO_ID, world);
    const withFirstPlayer = addPlayerSessionState(state, firstPlayer, context);
    const withBothPlayers = addPlayerSessionState(withFirstPlayer, secondPlayer, context);
    const replacement = {
      ...firstPlayer,
      hand: { ...firstPlayer.hand, sizeLimit: 8 },
    };
    const nextState = replacePlayerSessionState(withBothPlayers, replacement, context);

    expect(nextState.playerOrder).toEqual([PLAYER_ONE_ID, PLAYER_TWO_ID]);
    expect(getPlayerSessionState(nextState, PLAYER_ONE_ID).hand.sizeLimit).toBe(8);
    expect(getPlayerSessionState(nextState, PLAYER_TWO_ID)).toBe(secondPlayer);
    expect(getPlayerSessionState(withBothPlayers, PLAYER_ONE_ID).hand.sizeLimit).toBe(6);
  });

  it("rejects player aggregates containing state owned by another player", () => {
    const { state, context, world } = createEmptySession();
    const player = createPlayerState(PLAYER_ONE_ID, world);
    const invalidPlayer = {
      ...player,
      resources: { ...player.resources, playerId: PLAYER_TWO_ID },
    };

    expect(() => addPlayerSessionState(state, invalidPlayer, context)).toThrow(
      "state owned by another player",
    );
  });

  it("rejects a current tile that has not been explored by the player", () => {
    const { state, context, world } = createEmptySession();
    const player = createPlayerState(PLAYER_ONE_ID, world);
    const unexploredTile = world.map.tiles.find(
      (tile) => tile.tileId !== player.map.currentTileId,
    )!;
    const invalidPlayer = {
      ...player,
      map: { ...player.map, currentTileId: unexploredTile.tileId },
    };

    expect(() => addPlayerSessionState(state, invalidPlayer, context)).toThrow(
      "current tile has not been explored",
    );
  });
});
