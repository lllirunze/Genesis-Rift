import type { TileFeature } from "@genesis-rift/game-core";
import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

/** 默认地图中用于完整地点地块渲染的固定设施引用。 */
const DEFAULT_MAP_LOCATION_FEATURES: Readonly<Record<string, TileFeature>> = {
  "0,8,-8": {
    featureId: "map-feature.town.north",
    type: "structure",
    referenceId: "location.town",
  },
  "8,-8,0": {
    featureId: "map-feature.village.south-east",
    type: "structure",
    referenceId: "location.village",
  },
  "-8,0,8": {
    featureId: "map-feature.temple.south-west",
    type: "structure",
    referenceId: "location.temple",
  },
  "0,0,0": {
    featureId: "map-feature.ancient-ruins",
    type: "structure",
    referenceId: "location.ruin",
  },
};

/** 描述默认地图生成单个地块时需要使用的静态内容。 */
export interface DefaultMapTileConfiguration {
  readonly tileId: TileId;
  readonly coordinate: CubeCoordinate;
  readonly elevation: number;
  readonly terrainDefinitionId: string;
  readonly regionDefinitionId: string;
  readonly passability: "passable";
  readonly features: readonly TileFeature[];
}

/**
 * 方法名：createDefaultMapTileConfiguration
 * 作用：根据固定坐标规则创建默认对局地图的地形、高度、区域与地点设施配置。
 * @param coordinate 需要生成内容的立方坐标。
 * @param tileId 该坐标对应的稳定地块标识。
 * @returns 可直接传入地图模型创建函数的静态地块配置。
 */
export function createDefaultMapTileConfiguration(
  coordinate: CubeCoordinate,
  tileId: TileId,
): DefaultMapTileConfiguration {
  const coordinateKey = `${coordinate.x},${coordinate.y},${coordinate.z}`;
  const locationFeature = DEFAULT_MAP_LOCATION_FEATURES[coordinateKey];
  const terrainDefinitionId = getDefaultTerrainDefinitionId(coordinate);

  return {
    tileId,
    coordinate,
    elevation: getDefaultElevation(terrainDefinitionId, coordinate),
    terrainDefinitionId,
    regionDefinitionId: locationFeature === undefined ? "region_000001" : "region_000002",
    passability: "passable",
    features: locationFeature === undefined ? [] : [locationFeature],
  };
}

/** 根据稳定坐标分区选择默认基础地形，不读取或消耗游戏随机流。 */
function getDefaultTerrainDefinitionId(coordinate: CubeCoordinate): string {
  const terrainPattern = Math.abs(coordinate.x * 17 + coordinate.z * 31 + coordinate.y * 7) % 12;

  if (terrainPattern === 0 || terrainPattern === 1) {
    return "terrain_000004";
  }

  if (terrainPattern >= 2 && terrainPattern <= 4) {
    return "terrain_000002";
  }

  if (terrainPattern === 5 || terrainPattern === 6) {
    return "terrain_000003";
  }

  return "terrain_000001";
}

/** 为山地提供有限高度差，确保默认地图不会因高度配置无法通行。 */
function getDefaultElevation(terrainDefinitionId: string, coordinate: CubeCoordinate): number {
  if (terrainDefinitionId !== "terrain_000003") {
    return 0;
  }

  return Math.abs(coordinate.x + coordinate.z) % 2 === 0 ? 1 : 2;
}
