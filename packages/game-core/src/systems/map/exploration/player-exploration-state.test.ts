import { describe, expect, it } from "vitest";

import type { PlayerId, TileId } from "@genesis-rift/shared";

import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import {
  canTileEnterVision,
  createPlayerExplorationState,
  isTileExplored,
  recordSuccessfulTileEntry,
  validatePlayerExplorationState,
} from "./player-exploration-state.ts";

const PLAYER_ID = "player-1" as PlayerId;
const OTHER_PLAYER_ID = "player-2" as PlayerId;
const SPAWN_TILE_ID = "tile.0,0,0" as TileId;
const NORTH_TILE_ID = "tile.0,1,-1" as TileId;
const MAP_CONTENT_DEFINITIONS = {
  terrains: {
    "terrain.plain": {
      definitionId: "terrain.plain",
      name: "Plain",
      tags: ["land"],
      movementCostModifier: 0,
    },
  },
  regions: {
    "region.wilderness": {
      definitionId: "region.wilderness",
      name: "Wilderness",
      category: "wilderness",
      tags: ["outdoor"],
    },
  },
} as const satisfies MapContentDefinitionCatalog;
const MAP = createMap();

describe("player exploration state", () => {
  it("marks only the spawn tile as explored during player initialization", () => {
    const state = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);

    expect(state).toEqual({
      playerId: PLAYER_ID,
      exploredTileIds: [SPAWN_TILE_ID],
    });
    expect(isTileExplored(state, SPAWN_TILE_ID)).toBe(true);
    expect(canTileEnterVision(state, SPAWN_TILE_ID)).toBe(true);
    expect(isTileExplored(state, NORTH_TILE_ID)).toBe(false);
    expect(canTileEnterVision(state, NORTH_TILE_ID)).toBe(false);
  });

  it("records a successful first entry without mutating the previous state", () => {
    const initialState = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);
    const result = recordSuccessfulTileEntry(initialState, NORTH_TILE_ID, MAP);

    expect(result.isFirstExploration).toBe(true);
    expect(result.enteredTileId).toBe(NORTH_TILE_ID);
    expect(result.explorationState.exploredTileIds).toEqual([SPAWN_TILE_ID, NORTH_TILE_ID]);
    expect(canTileEnterVision(result.explorationState, NORTH_TILE_ID)).toBe(true);
    expect(initialState.exploredTileIds).toEqual([SPAWN_TILE_ID]);
  });

  it("keeps repeated entries idempotent", () => {
    const initialState = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);
    const firstEntry = recordSuccessfulTileEntry(initialState, NORTH_TILE_ID, MAP);
    const repeatedEntry = recordSuccessfulTileEntry(
      firstEntry.explorationState,
      NORTH_TILE_ID,
      MAP,
    );

    expect(repeatedEntry.isFirstExploration).toBe(false);
    expect(repeatedEntry.explorationState).toBe(firstEntry.explorationState);
    expect(repeatedEntry.explorationState.exploredTileIds).toEqual([SPAWN_TILE_ID, NORTH_TILE_ID]);
  });

  it("keeps exploration knowledge isolated between players", () => {
    const playerState = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);
    const otherPlayerState = createPlayerExplorationState(OTHER_PLAYER_ID, SPAWN_TILE_ID, MAP);
    const exploredPlayerState = recordSuccessfulTileEntry(
      playerState,
      NORTH_TILE_ID,
      MAP,
    ).explorationState;

    expect(canTileEnterVision(exploredPlayerState, NORTH_TILE_ID)).toBe(true);
    expect(canTileEnterVision(otherPlayerState, NORTH_TILE_ID)).toBe(false);
  });

  it("does not change state when exploration and vision are only queried", () => {
    const state = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);

    expect(isTileExplored(state, NORTH_TILE_ID)).toBe(false);
    expect(canTileEnterVision(state, NORTH_TILE_ID)).toBe(false);
    expect(state.exploredTileIds).toEqual([SPAWN_TILE_ID]);
  });

  it("rejects unknown tiles and invalid persisted exploration states", () => {
    const state = createPlayerExplorationState(PLAYER_ID, SPAWN_TILE_ID, MAP);
    const unknownTileId = "tile.unknown" as TileId;

    expect(() => recordSuccessfulTileEntry(state, unknownTileId, MAP)).toThrow(
      "Unknown exploration tile",
    );
    expect(() =>
      validatePlayerExplorationState(
        {
          ...state,
          exploredTileIds: [SPAWN_TILE_ID, SPAWN_TILE_ID],
        },
        MAP,
      ),
    ).toThrow("Duplicate explored tile id");
  });
});

/**
 * 方法名：createMap
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createMap(): HexMap {
  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) =>
      createHexTile(
        {
          tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
          coordinate,
          elevation: 0,
          terrainDefinitionId: "terrain.plain",
          regionDefinitionId: "region.wilderness",
          passability: "passable",
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ),
    MAP_CONTENT_DEFINITIONS,
  );
}
