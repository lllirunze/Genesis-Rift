import { describe, expect, it } from "vitest";
import type { CubeCoordinate, PlayerId, TileId } from "@genesis-rift/shared";

import type { PlayerExplorationState } from "../exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile, type HexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import {
  findNormalMovementRoute,
  getReachableNormalMovementArea,
} from "./normal-movement-pathfinding.ts";

const PLAYER_ID = "pathfinding-player" as PlayerId;

/** 寻路测试统一使用的普通、森林与山地配置。 */
const MAP_CONTENT_DEFINITIONS = {
  terrains: {
    "terrain.plain": {
      definitionId: "terrain.plain",
      name: "Plain",
      tags: ["land"],
      movementCostModifier: 0,
    },
    "terrain.forest": {
      definitionId: "terrain.forest",
      name: "Forest",
      tags: ["land", "vegetation"],
      movementCostModifier: 1,
    },
    "terrain.mountain": {
      definitionId: "terrain.mountain",
      name: "Mountain",
      tags: ["land", "highland"],
      movementCostModifier: 2,
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

describe("normal movement pathfinding", () => {
  it("selects the route with the lowest total movement cost", () => {
    const map = createMap({
      terrainDefinitionIds: new Map([["0,1,-1", "terrain.mountain"]]),
    });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const northEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const target = requireTile(map, { x: 1, y: 1, z: -2 });

    const route = findNormalMovementRoute({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      originTileId: center.tileId,
      targetTileId: target.tileId,
      explorationState: createExplorationState(center, north, northEast, target),
      availableMovementPoints: 4,
    });

    expect(route).not.toBeNull();
    expect(route).toMatchObject({
      directions: ["NORTH_EAST_60", "NORTH"],
      paidMovementCost: 2,
      consumedMovementPoints: 2,
      remainingMovementPoints: 2,
      endsWithFirstExploration: false,
    });
    expect(route?.steps.map((step) => step.targetTileId)).toEqual([
      northEast.tileId,
      target.tileId,
    ]);
  });

  it("uses the fixed six-direction order when equal-cost routes also have equal step counts", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const northEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const target = requireTile(map, { x: 1, y: 1, z: -2 });

    const route = findNormalMovementRoute({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      originTileId: center.tileId,
      targetTileId: target.tileId,
      explorationState: createExplorationState(center, north, northEast, target),
      availableMovementPoints: 2,
    });

    expect(route?.directions).toEqual(["NORTH", "NORTH_EAST_60"]);
  });

  it("includes unknown adjacent tiles as endpoints but never expands routes through them", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const unknownNorth = requireTile(map, { x: 0, y: 1, z: -1 });
    const tileBehindUnknown = requireTile(map, { x: 0, y: 2, z: -2 });
    const input = {
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      originTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 2,
    } as const;

    const area = getReachableNormalMovementArea(input);
    const unknownRoute = area.routes.find((route) => route.targetTileId === unknownNorth.tileId);

    expect(unknownRoute).toMatchObject({
      paidMovementCost: 1,
      consumedMovementPoints: 2,
      remainingMovementPoints: 0,
      endsWithFirstExploration: true,
    });
    expect(unknownRoute?.steps[0]?.isFirstExploration).toBe(true);
    expect(area.routes.some((route) => route.targetTileId === tileBehindUnknown.tileId)).toBe(
      false,
    );
    expect(
      findNormalMovementRoute({ ...input, targetTileId: tileBehindUnknown.tileId }),
    ).toBeNull();
  });

  it("excludes blocked and unsafe-height targets from the reachable area", () => {
    const map = createMap({
      blockedCoordinateKeys: new Set(["0,1,-1"]),
      elevations: new Map([["1,0,-1", 4]]),
    });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const blockedNorth = requireTile(map, { x: 0, y: 1, z: -1 });
    const unsafeNorthEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const area = getReachableNormalMovementArea({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      originTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 20,
    });
    const targetTileIds = area.routes.map((route) => route.targetTileId);

    expect(targetTileIds).not.toContain(blockedNorth.tileId);
    expect(targetTileIds).not.toContain(unsafeNorthEast.tileId);
  });

  it("returns null when the target cost exceeds the available movement points", () => {
    const map = createMap({ elevations: new Map([["0,1,-1", 2]]) });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 0, y: 1, z: -1 });

    expect(
      findNormalMovementRoute({
        map,
        terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
        originTileId: center.tileId,
        targetTileId: target.tileId,
        explorationState: createExplorationState(center),
        availableMovementPoints: 4,
      }),
    ).toBeNull();
  });

  it("returns an empty zero-cost route when the target is the origin", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const route = findNormalMovementRoute({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      originTileId: center.tileId,
      targetTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 3,
    });

    expect(route).toEqual({
      originTileId: center.tileId,
      targetTileId: center.tileId,
      directions: [],
      steps: [],
      paidMovementCost: 0,
      consumedMovementPoints: 0,
      remainingMovementPoints: 3,
      endsWithFirstExploration: false,
    });
  });

  it("rejects an origin tile missing from the player's exploration record", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });

    expect(() =>
      getReachableNormalMovementArea({
        map,
        terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
        originTileId: north.tileId,
        explorationState: createExplorationState(center),
        availableMovementPoints: 3,
      }),
    ).toThrow("origin tile has not been explored");
  });
});

/** 描述创建寻路测试地图时可以覆盖的地块配置。 */
interface CreateMapOptions {
  readonly blockedCoordinateKeys?: ReadonlySet<string>;
  readonly elevations?: ReadonlyMap<string, number>;
  readonly terrainDefinitionIds?: ReadonlyMap<string, string>;
}

/**
 * 方法名：createMap
 * 作用：创建完整十环测试地图，并按坐标覆盖障碍、高度与地形。
 * @param options 需要覆盖的障碍坐标、高度和基础地形配置。
 * @returns 可用于普通移动寻路的六边形地图。
 */
function createMap(options: CreateMapOptions = {}): HexMap {
  const blockedCoordinateKeys = options.blockedCoordinateKeys ?? new Set<string>();
  const elevations = options.elevations ?? new Map<string, number>();
  const terrainDefinitionIds = options.terrainDefinitionIds ?? new Map<string, string>();

  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) => {
      const coordinateKey = getCubeCoordinateKey(coordinate);

      return createHexTile(
        {
          tileId: `tile.${coordinateKey}` as TileId,
          coordinate,
          elevation: elevations.get(coordinateKey) ?? 0,
          terrainDefinitionId: terrainDefinitionIds.get(coordinateKey) ?? "terrain.plain",
          regionDefinitionId: "region.wilderness",
          passability: blockedCoordinateKeys.has(coordinateKey) ? "blocked" : "passable",
        },
        MAP_CONTENT_DEFINITIONS,
      );
    }),
    MAP_CONTENT_DEFINITIONS,
  );
}

/**
 * 方法名：requireTile
 * 作用：读取测试地图中的指定地块，并在测试数据缺失时立即失败。
 * @param map 待查询的六边形测试地图。
 * @param coordinate 目标地块的立方体坐标。
 * @returns 坐标对应的地图地块。
 * @throws 测试地图不存在目标坐标时抛出错误。
 */
function requireTile(map: HexMap, coordinate: CubeCoordinate): HexTile {
  const tile = map.getTileAt(coordinate);

  if (tile === undefined) {
    throw new Error(`Missing test tile: ${getCubeCoordinateKey(coordinate)}`);
  }

  return tile;
}

/**
 * 方法名：createExplorationState
 * 作用：根据给定地块创建一份合法的玩家个人探索记录。
 * @param exploredTiles 已经被测试玩家实际踏足的地块。
 * @returns 包含去重地块标识的玩家探索状态。
 */
function createExplorationState(...exploredTiles: readonly HexTile[]): PlayerExplorationState {
  return {
    playerId: PLAYER_ID,
    exploredTileIds: [...new Set(exploredTiles.map((tile) => tile.tileId))],
  };
}
