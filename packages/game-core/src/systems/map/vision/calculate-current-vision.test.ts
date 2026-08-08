import { describe, expect, it } from "vitest";
import type { CubeCoordinate, PlayerId, TileId } from "@genesis-rift/shared";

import type { PlayerExplorationState } from "../exploration/player-exploration-state.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile, type HexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import { calculateCurrentVision, evaluateTileVisibility } from "./calculate-current-vision.ts";

const PLAYER_ID = "vision-player" as PlayerId;

/** 视野测试使用的普通地形与野外区域配置。 */
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

describe("current map vision", () => {
  it("only returns explored tiles inside the configured vision range", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const unknownNorthEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const input = {
      map,
      observerTileId: center.tileId,
      explorationState: createExplorationState(center, north, farNorth),
      visionRange: 1,
    } as const;

    const result = calculateCurrentVision(input);

    expect(result.visibleTileIds).toEqual([center.tileId, north.tileId]);
    expect(getInformationState(result, center.tileId)).toBe("CURRENTLY_VISIBLE");
    expect(getInformationState(result, farNorth.tileId)).toBe("EXPLORED_NOT_VISIBLE");
    expect(getInformationState(result, unknownNorthEast.tileId)).toBe("UNKNOWN");
    expect(evaluateTileVisibility(input, farNorth.tileId)).toMatchObject({
      visible: false,
      reason: "OUT_OF_RANGE",
      distance: 2,
    });
    expect(evaluateTileVisibility(input, unknownNorthEast.tileId)).toMatchObject({
      visible: false,
      reason: "NOT_EXPLORED",
    });
  });

  it("shows the first higher tile but hides explored tiles behind it", () => {
    const map = createMap({ elevations: new Map([["0,1,-1", 2]]) });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const highNorth = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const input = {
      map,
      observerTileId: center.tileId,
      explorationState: createExplorationState(center, highNorth, farNorth),
      visionRange: 3,
    } as const;

    expect(evaluateTileVisibility(input, highNorth.tileId).visible).toBe(true);
    expect(evaluateTileVisibility(input, farNorth.tileId)).toMatchObject({
      visible: false,
      reason: "LINE_OF_SIGHT_BLOCKED",
    });
  });

  it("allows a higher observer to see explored lower terrain", () => {
    const map = createMap({ elevations: new Map([["0,0,0", 3]]) });
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });

    expect(
      evaluateTileVisibility(
        {
          map,
          observerTileId: center.tileId,
          explorationState: createExplorationState(center, north, farNorth),
          visionRange: 2,
        },
        farNorth.tileId,
      ),
    ).toMatchObject({ visible: true, tile: { distance: 2 } });
  });

  it("stops a line of sight when its intermediate tile has not been explored", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });

    expect(
      evaluateTileVisibility(
        {
          map,
          observerTileId: center.tileId,
          explorationState: createExplorationState(center, farNorth),
          visionRange: 2,
        },
        farNorth.tileId,
      ),
    ).toMatchObject({ visible: false, reason: "LINE_OF_SIGHT_BLOCKED" });
  });

  it("accepts a target when at least one standard boundary branch remains clear", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const northEast = requireTile(map, { x: 1, y: 0, z: -1 });
    const target = requireTile(map, { x: 1, y: 1, z: -2 });
    const baseInput = {
      map,
      observerTileId: center.tileId,
      explorationState: createExplorationState(center, north, northEast, target),
      visionRange: 2,
    } as const;

    const oneBranchClear = evaluateTileVisibility(
      { ...baseInput, blockingTileIds: [north.tileId] },
      target.tileId,
    );
    const bothBranchesBlocked = evaluateTileVisibility(
      { ...baseInput, blockingTileIds: [north.tileId, northEast.tileId] },
      target.tileId,
    );

    expect(oneBranchClear).toMatchObject({
      visible: true,
      tile: { lineOfSightTileIds: [center.tileId, northEast.tileId, target.tileId] },
    });
    expect(bothBranchesBlocked).toMatchObject({
      visible: false,
      reason: "LINE_OF_SIGHT_BLOCKED",
    });
  });

  it("keeps an explicitly blocking tile visible while hiding the tile behind it", () => {
    const map = createMap();
    const center = requireTile(map, { x: 0, y: 0, z: 0 });
    const north = requireTile(map, { x: 0, y: 1, z: -1 });
    const farNorth = requireTile(map, { x: 0, y: 2, z: -2 });
    const input = {
      map,
      observerTileId: center.tileId,
      explorationState: createExplorationState(center, north, farNorth),
      visionRange: 2,
      blockingTileIds: [north.tileId],
    } as const;

    expect(evaluateTileVisibility(input, north.tileId).visible).toBe(true);
    expect(evaluateTileVisibility(input, farNorth.tileId)).toMatchObject({
      visible: false,
      reason: "LINE_OF_SIGHT_BLOCKED",
    });
  });
});

/** 描述创建视野测试地图时可以覆盖的地块配置。 */
interface CreateMapOptions {
  readonly elevations?: ReadonlyMap<string, number>;
}

/**
 * 方法名：createMap
 * 作用：创建完整十环测试地图，并按坐标覆盖测试所需高度。
 * @param options 需要覆盖的地块高度配置。
 * @returns 可用于视野判定的六边形地图。
 */
function createMap(options: CreateMapOptions = {}): HexMap {
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
          passability: "passable",
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

/**
 * 方法名：getInformationState
 * 作用：从当前视野结果中读取指定地块的三层战争迷雾状态。
 * @param result 当前视野计算结果。
 * @param tileId 需要读取信息状态的地图地块标识。
 * @returns 指定地块的当前信息状态。
 * @throws 结果中不存在目标地块时抛出错误。
 */
function getInformationState(
  result: ReturnType<typeof calculateCurrentVision>,
  tileId: TileId,
): string {
  const information = result.tileInformation.find((tile) => tile.tileId === tileId);

  if (information === undefined) {
    throw new Error(`Missing tile information: ${tileId}`);
  }

  return information.state;
}
