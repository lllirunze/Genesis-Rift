import { describe, expect, it } from "vitest";
import type { CubeCoordinate, PlayerId, TileId } from "@genesis-rift/shared";

import type { PlayerExplorationState } from "../exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile, type HexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import { settleSpecialConnection } from "./settle-special-connection.ts";
import type { SpecialConnectionDefinition } from "./special-connection-definition.ts";
import {
  createSpecialConnectionState,
  discoverSpecialConnection,
} from "./special-connection-state.ts";

const PLAYER_ID = "connection-player" as PlayerId;

/** 特殊连接测试使用的普通地形与野外区域配置。 */
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

describe("special connection settlement", () => {
  it("uses a public one-way connection and records first exploration", () => {
    const map = createMap();
    const source = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 3, y: -1, z: -2 });
    const definition = createConnection(source, target);
    const result = settleSpecialConnection({
      map,
      playerId: PLAYER_ID,
      currentTileId: source.tileId,
      explorationState: createExplorationState(source),
      availableMovementPoints: 4,
      definition,
      state: createSpecialConnectionState(definition),
    });

    expect(result).toMatchObject({
      outcome: "first_exploration",
      finalTileId: target.tileId,
      paidMovementCost: 2,
      remainingMovementPoints: 0,
      isFirstExploration: true,
      triggersArrivalEffects: true,
    });
    expect(result.explorationState.exploredTileIds).toContain(target.tileId);
  });

  it("allows a two-way connection to be used from its configured target", () => {
    const map = createMap();
    const source = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 3, y: -1, z: -2 });
    const definition = { ...createConnection(source, target), direction: "TWO_WAY" } as const;
    const result = settleSpecialConnection({
      map,
      playerId: PLAYER_ID,
      currentTileId: target.tileId,
      explorationState: createExplorationState(source, target),
      availableMovementPoints: 3,
      definition,
      state: createSpecialConnectionState(definition),
    });

    expect(result).toMatchObject({
      outcome: "completed",
      finalTileId: source.tileId,
      remainingMovementPoints: 1,
    });
  });

  it("requires a hidden connection to be discovered by the current player", () => {
    const map = createMap();
    const source = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 3, y: -1, z: -2 });
    const definition = { ...createConnection(source, target), visibility: "HIDDEN" } as const;
    const initialState = createSpecialConnectionState(definition);
    const input = {
      map,
      playerId: PLAYER_ID,
      currentTileId: source.tileId,
      explorationState: createExplorationState(source, target),
      availableMovementPoints: 3,
      definition,
    } as const;

    expect(settleSpecialConnection({ ...input, state: initialState })).toMatchObject({
      outcome: "undiscovered",
      finalTileId: source.tileId,
      paidMovementCost: 0,
    });
    expect(
      settleSpecialConnection({
        ...input,
        state: discoverSpecialConnection(initialState, PLAYER_ID),
      }).outcome,
    ).toBe("completed");
  });

  it("uses external condition evaluators without coupling the connection to other systems", () => {
    const map = createMap();
    const source = requireTile(map, { x: 0, y: 0, z: 0 });
    const target = requireTile(map, { x: 3, y: -1, z: -2 });
    const definition = {
      ...createConnection(source, target),
      conditionIds: ["condition.hasKey"],
    } as const;
    const baseInput = {
      map,
      playerId: PLAYER_ID,
      currentTileId: source.tileId,
      explorationState: createExplorationState(source, target),
      availableMovementPoints: 3,
      definition,
      state: createSpecialConnectionState(definition),
    } as const;

    expect(settleSpecialConnection(baseInput).outcome).toBe("condition_not_met");
    expect(
      settleSpecialConnection({
        ...baseInput,
        conditionEvaluator: { isSatisfied: (conditionId) => conditionId === "condition.hasKey" },
      }).outcome,
    ).toBe("completed");
  });
});

/**
 * 方法名：createConnection
 * 作用：创建特殊连接测试使用的公开单向传送定义。
 * @param source 特殊连接配置起点。
 * @param target 特殊连接配置终点。
 * @returns 可直接用于结算测试的特殊连接定义。
 */
function createConnection(source: HexTile, target: HexTile): SpecialConnectionDefinition {
  return {
    connectionId: "connection.testPortal",
    name: "TestPortal",
    typeId: "portal",
    sourceTileId: source.tileId,
    targetTileId: target.tileId,
    direction: "ONE_WAY",
    traversalMode: "TELEPORT",
    visibility: "PUBLIC",
    movementCost: 2,
    ignoresTargetPassability: false,
    recordsExploration: true,
    endsMovementOnFirstExploration: true,
    triggersArrivalEffects: true,
    conditionIds: [],
  };
}

/**
 * 方法名：createMap
 * 作用：创建完整十环特殊连接测试地图。
 * @returns 可用于特殊连接测试的六边形地图。
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
 * 作用：创建特殊连接测试使用的玩家探索记录。
 * @param exploredTiles 已经被玩家踏足的测试地块。
 * @returns 合法的个人探索状态。
 */
function createExplorationState(...exploredTiles: readonly HexTile[]): PlayerExplorationState {
  return {
    playerId: PLAYER_ID,
    exploredTileIds: [...new Set(exploredTiles.map((tile) => tile.tileId))],
  };
}
