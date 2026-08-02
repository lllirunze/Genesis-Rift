import { describe, expect, it } from "vitest";
import type { CubeCoordinate, PlayerId, TileId } from "@genesis-rift/shared";

import type { PlayerExplorationState } from "../exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile, type HexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import { settleNormalMovement } from "./settle-normal-movement.ts";

const PLAYER_ID = "movement-player" as PlayerId;

/** 普通移动测试统一使用的基础地形与野外区域。 */
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

describe("normal movement settlement", () => {
  it("moves through explored tiles and allows changing direction after each step", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const northEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const explorationState = createExplorationState(center, north, northEast);

    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState,
      availableMovementPoints: 3,
      directions: ["NORTH", "SOUTH_EAST_60"],
    });

    expect(result.outcome).toBe("completed");
    expect(result.finalTileId).toBe(northEast.tileId);
    expect(result.remainingMovementPoints).toBe(1);
    expect(result.paidMovementCost).toBe(2);
    expect(result.consumedMovementPoints).toBe(2);
    expect(result.steps.map((step) => step.targetTileId)).toEqual([north.tileId, northEast.tileId]);
    expect(result.steps.every((step) => !step.isFirstExploration)).toBe(true);
  });

  it("clears all remaining movement and stops after entering the first unknown tile", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const unknownTarget = requireTile(map, { x: 0, y: 2, z: -2 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center, north),
      availableMovementPoints: 4,
      directions: ["NORTH", "NORTH", "NORTH"],
    });

    expect(result.outcome).toBe("first_exploration");
    expect(result.finalTileId).toBe(unknownTarget.tileId);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]).toMatchObject({
      targetTileId: unknownTarget.tileId,
      movementCost: 1,
      remainingMovementPoints: 0,
      isFirstExploration: true,
    });
    expect(result.paidMovementCost).toBe(2);
    expect(result.consumedMovementPoints).toBe(4);
    expect(result.explorationState.exploredTileIds).toContain(unknownTarget.tileId);
  });

  it("does not enter or explore a target when movement points cannot pay its base cost", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const explorationState = createExplorationState(center);
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState,
      availableMovementPoints: 0,
      directions: ["NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "insufficient_movement",
      finalTileId: center.tileId,
      remainingMovementPoints: 0,
      paidMovementCost: 0,
      consumedMovementPoints: 0,
      steps: [],
      interruption: {
        reason: "insufficient_movement",
        direction: "NORTH",
      },
    });
    expect(result.explorationState).toBe(explorationState);
    expect(result.explorationState.exploredTileIds).not.toContain(north.tileId);
  });

  it("combines base, target terrain, and squared uphill costs for each step", () => {
    const map = createMap(
      new Set(),
      new Map([["0,1,-1", 2]]),
      new Map([["0,1,-1", "terrain.forest"]]),
    );
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center, north),
      availableMovementPoints: 7,
      directions: ["NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "completed",
      finalTileId: north.tileId,
      remainingMovementPoints: 1,
      paidMovementCost: 6,
      consumedMovementPoints: 6,
    });
    expect(result.steps[0]).toMatchObject({
      elevationDifference: 2,
      baseCost: 1,
      terrainCost: 1,
      uphillCost: 4,
      movementCost: 6,
    });
  });

  it("does not enter a valid uphill target when total movement cost is insufficient", () => {
    const map = createMap(new Set(), new Map([["0,1,-1", 2]]));
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 4,
      directions: ["NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "insufficient_movement",
      finalTileId: center.tileId,
      remainingMovementPoints: 4,
      paidMovementCost: 0,
      steps: [],
    });
    expect(result.explorationState.exploredTileIds).not.toContain(north.tileId);
  });

  it.each([
    { originElevation: 0, targetElevation: 4 },
    { originElevation: 1, targetElevation: -3 },
  ])("interrupts movement when the height difference is unsafe", (elevations) => {
    const map = createMap(
      new Set(),
      new Map([
        ["0,0,0", elevations.originElevation],
        ["0,1,-1", elevations.targetElevation],
      ]),
    );
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 20,
      directions: ["NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "elevation_difference",
      finalTileId: center.tileId,
      remainingMovementPoints: 20,
      paidMovementCost: 0,
      steps: [],
      interruption: { reason: "elevation_difference", direction: "NORTH" },
    });
  });

  it("returns a blocked interruption without changing position or movement points", () => {
    const map = createMap(new Set(["0,1,-1"]));
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 3,
      directions: ["NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "blocked",
      finalTileId: center.tileId,
      remainingMovementPoints: 3,
      paidMovementCost: 0,
      steps: [],
      interruption: { reason: "blocked", direction: "NORTH" },
    });
  });

  it("keeps successful movement when a later step is blocked", () => {
    const map = createMap(new Set(["0,2,-2"]));
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center, north),
      availableMovementPoints: 3,
      directions: ["NORTH", "NORTH"],
    });

    expect(result).toMatchObject({
      outcome: "blocked",
      finalTileId: north.tileId,
      remainingMovementPoints: 2,
      paidMovementCost: 1,
      consumedMovementPoints: 1,
      interruption: { reason: "blocked", direction: "NORTH" },
    });
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.targetTileId).toBe(north.tileId);
  });

  it("returns an outside-map interruption at the outer ring", () => {
    const map = createMap();
    const boundary = requireTile(map, { x: 10, y: -5, z: -5 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: boundary.tileId,
      explorationState: createExplorationState(boundary),
      availableMovementPoints: 3,
      directions: ["NORTH_EAST_60"],
    });

    expect(result).toMatchObject({
      outcome: "outside_map",
      finalTileId: boundary.tileId,
      remainingMovementPoints: 3,
      interruption: {
        reason: "outside_map",
        direction: "NORTH_EAST_60",
        targetCoordinate: { x: 11, y: -5, z: -6 },
      },
    });
  });

  it("treats an empty direction sequence as choosing to stay in place", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const result = settleNormalMovement({
      map,
      terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      availableMovementPoints: 3,
      directions: [],
    });

    expect(result).toMatchObject({
      outcome: "completed",
      initialTileId: center.tileId,
      finalTileId: center.tileId,
      remainingMovementPoints: 3,
      consumedMovementPoints: 0,
      steps: [],
      interruption: null,
    });
  });

  it("rejects a current tile missing from the player's exploration record", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });

    expect(() =>
      settleNormalMovement({
        map,
        terrainDefinitions: MAP_CONTENT_DEFINITIONS.terrains,
        currentTileId: north.tileId,
        explorationState: createExplorationState(center),
        availableMovementPoints: 3,
        directions: [],
      }),
    ).toThrow("current tile has not been explored");
  });
});

/**
 * 方法名：createMap
 * 作用：创建完整十环测试地图，并按坐标设置不可通行地块。
 * @param blockedCoordinateKeys 需要标记为不可通行的坐标键集合。
 * @param elevations 需要覆盖默认高度的坐标与高度映射。
 * @param terrainDefinitionIds 需要覆盖默认地形的坐标与地形标识映射。
 * @returns 可用于普通移动结算的六边形地图。
 */
function createMap(
  blockedCoordinateKeys: ReadonlySet<string> = new Set(),
  elevations: ReadonlyMap<string, number> = new Map(),
  terrainDefinitionIds: ReadonlyMap<string, string> = new Map(),
): HexMap {
  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) =>
      createHexTile(
        {
          tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
          coordinate,
          elevation: elevations.get(getCubeCoordinateKey(coordinate)) ?? 0,
          terrainDefinitionId:
            terrainDefinitionIds.get(getCubeCoordinateKey(coordinate)) ?? "terrain.plain",
          regionDefinitionId: "region.wilderness",
          passability: blockedCoordinateKeys.has(getCubeCoordinateKey(coordinate))
            ? "blocked"
            : "passable",
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ),
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
