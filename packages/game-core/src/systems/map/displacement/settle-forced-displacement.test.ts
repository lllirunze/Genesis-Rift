import { describe, expect, it } from "vitest";
import type { CubeCoordinate, PlayerId, TileId } from "@genesis-rift/shared";

import type { PlayerExplorationState } from "../exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { getNeighborCoordinate } from "../geometry/hex-direction.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile, type HexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import type { ForcedDisplacementDefinition } from "./forced-displacement-definition.ts";
import { ForcedDisplacementPlannerRegistry } from "./forced-displacement-planner-registry.ts";
import { settleForcedDisplacement } from "./settle-forced-displacement.ts";

const PLAYER_ID = "displacement-player" as PlayerId;

/** 强制位移测试使用的普通地形与野外区域配置。 */
const MAP_CONTENT_DEFINITIONS = {
  terrains: {
    terrain_000001: {
      definitionId: "terrain_000001",
      name: "Plain",
      tags: ["land"],
      movementCostModifier: 0,
    },
  },
  regions: {
    region_000001: {
      definitionId: "region_000001",
      name: "Wilderness",
      category: "wilderness",
      tags: ["outdoor"],
    },
  },
} as const satisfies MapContentDefinitionCatalog;

describe("forced displacement settlement", () => {
  it("uses the definition planner id to create a typed displacement plan", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const definition = createDefinition() as ForcedDisplacementDefinition<{
      readonly distance: number;
    }>;
    const registry = new ForcedDisplacementPlannerRegistry();

    registry.register<{ readonly distance: number }>({
      plannerId: "directionalPush",
      createPlan: (currentDefinition, context) => {
        const originTile = context.map.getTileById(context.originTileId)!;
        const targetCoordinates: CubeCoordinate[] = [];
        let currentCoordinate = originTile.coordinate;

        for (let step = 0; step < currentDefinition.parameters.distance; step += 1) {
          currentCoordinate = getNeighborCoordinate(currentCoordinate, "NORTH");
          targetCoordinates.push(currentCoordinate);
        }

        return {
          definitionId: currentDefinition.definitionId,
          targetCoordinates,
        };
      },
    });

    expect(registry.createPlan(definition, { map, originTileId: center.tileId })).toEqual({
      definitionId: definition.definitionId,
      targetCoordinates: [
        { x: 0, y: 1, z: -1 },
        { x: 0, y: 2, z: -2 },
      ],
    });
  });

  it("executes a path displacement step by step and records exploration", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const definition = createDefinition();
    const result = settleForcedDisplacement({
      map,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      definition,
      plan: {
        definitionId: definition.definitionId,
        targetCoordinates: [north.coordinate, farNorth.coordinate],
      },
    });

    expect(result).toMatchObject({
      outcome: "completed",
      finalTileId: farNorth.tileId,
      endsActiveMovement: true,
    });
    expect(result.steps.map((step) => step.targetTileId)).toEqual([north.tileId, farNorth.tileId]);
    expect(result.steps.every((step) => step.isFirstExploration)).toBe(true);
  });

  it("stops at the last legal tile when a path reaches the map boundary", () => {
    const map = createMap();
    const boundary = requireTile(map, { x: 10, y: -5, z: -5 });
    const definition = createDefinition();
    const result = settleForcedDisplacement({
      map,
      currentTileId: boundary.tileId,
      explorationState: createExplorationState(boundary),
      definition,
      plan: {
        definitionId: definition.definitionId,
        targetCoordinates: [{ x: 11, y: -5, z: -6 }],
      },
    });

    expect(result).toMatchObject({
      outcome: "stopped_at_boundary",
      finalTileId: boundary.tileId,
      steps: [],
      interruptedCoordinate: { x: 11, y: -5, z: -6 },
    });
  });

  it("keeps completed steps when STOP encounters an obstruction", () => {
    const map = createMap({ blockedCoordinateKeys: new Set(["0,2,-2"]) });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const definition = createDefinition();
    const result = settleForcedDisplacement({
      map,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      definition,
      plan: {
        definitionId: definition.definitionId,
        targetCoordinates: [north.coordinate, farNorth.coordinate],
      },
    });

    expect(result).toMatchObject({
      outcome: "stopped_by_obstruction",
      finalTileId: north.tileId,
    });
    expect(result.steps).toHaveLength(1);
    expect(result.explorationState.exploredTileIds).toContain(north.tileId);
  });

  it("rolls back all completed steps when FAIL encounters an obstruction", () => {
    const map = createMap({ blockedCoordinateKeys: new Set(["0,2,-2"]) });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const definition = { ...createDefinition(), obstructionBehavior: "FAIL" } as const;
    const explorationState = createExplorationState(center);
    const result = settleForcedDisplacement({
      map,
      currentTileId: center.tileId,
      explorationState,
      definition,
      plan: {
        definitionId: definition.definitionId,
        targetCoordinates: [north.coordinate, farNorth.coordinate],
      },
    });

    expect(result).toMatchObject({
      outcome: "failed_by_obstruction",
      finalTileId: center.tileId,
      steps: [],
    });
    expect(result.explorationState).toBe(explorationState);
  });

  it("allows a teleport definition to ignore passability and elevation", () => {
    const map = createMap({
      blockedCoordinateKeys: new Set(["3,-1,-2"]),
      elevations: new Map([["3,-1,-2", 10]]),
    });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 3, y: -1, z: -2 });
    const definition = {
      ...createDefinition(),
      definitionId: "displacement.spatialRift",
      mode: "TELEPORT",
      obstructionBehavior: "IGNORE",
      elevationRule: "IGNORE",
    } as const;
    const result = settleForcedDisplacement({
      map,
      currentTileId: center.tileId,
      explorationState: createExplorationState(center),
      definition,
      plan: {
        definitionId: definition.definitionId,
        targetCoordinates: [target.coordinate],
      },
    });

    expect(result).toMatchObject({ outcome: "completed", finalTileId: target.tileId });
  });
});

/**
 * 方法名：createDefinition
 * 作用：创建路径型强制位移测试使用的默认停止策略。
 * @returns 可直接用于结算测试的强制位移定义。
 */
function createDefinition(): ForcedDisplacementDefinition {
  return {
    definitionId: "displacement.windGust",
    name: "WindGust",
    typeId: "windGust",
    plannerId: "directionalPush",
    mode: "PATH",
    boundaryBehavior: "STOP",
    obstructionBehavior: "STOP",
    elevationRule: "NORMAL_LIMIT",
    recordsExploration: true,
    triggersArrivalEffects: true,
    endsActiveMovement: true,
    parameters: { distance: 2 },
  };
}

/** 描述创建强制位移测试地图时可以覆盖的地块配置。 */
interface CreateMapOptions {
  readonly blockedCoordinateKeys?: ReadonlySet<string>;
  readonly elevations?: ReadonlyMap<string, number>;
}

/**
 * 方法名：createMap
 * 作用：创建完整十环强制位移测试地图，并覆盖指定阻挡与高度。
 * @param options 需要覆盖的阻挡坐标与地块高度。
 * @returns 可用于强制位移结算的六边形地图。
 */
function createMap(options: CreateMapOptions = {}): HexMap {
  const blockedCoordinateKeys = options.blockedCoordinateKeys ?? new Set<string>();
  const elevations = options.elevations ?? new Map<string, number>();

  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) => {
      const coordinateKey = getCubeCoordinateKey(coordinate);

      return createHexTile(
        {
          tileId: `tile.${coordinateKey}` as TileId,
          coordinate,
          elevation: elevations.get(coordinateKey) ?? 0,
          terrainDefinitionId: "terrain_000001",
          regionDefinitionId: "region_000001",
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
 * 作用：读取测试地图中的指定地块。
 * @param map 待查询的六边形测试地图。
 * @param coordinate 目标地块立方体坐标。
 * @returns 坐标对应的地图地块。
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
 * 作用：创建强制位移测试使用的玩家探索记录。
 * @param exploredTiles 已经被玩家踏足的测试地块。
 * @returns 合法的个人探索状态。
 */
function createExplorationState(...exploredTiles: readonly HexTile[]): PlayerExplorationState {
  return {
    playerId: PLAYER_ID,
    exploredTileIds: [...new Set(exploredTiles.map((tile) => tile.tileId))],
  };
}
