import type { CubeCoordinate } from "@genesis-rift/shared";

import { createCubeCoordinate, getCubeCoordinateRing } from "../geometry/cube-coordinate.ts";
import { BASE_MAP_MAX_RING, BASE_MAP_TILE_COUNT } from "../map-config.ts";

/**
 * 方法名：getCompleteHexMapTileCount
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param maxRing 方法所需的 maxRing 参数。
 * @returns 本次处理得到的结果。
 */
export function getCompleteHexMapTileCount(maxRing: number): number {
  if (!Number.isSafeInteger(maxRing) || maxRing < 0) {
    throw new TypeError("maxRing must be a non-negative safe integer");
  }

  const tileCount = 1 + 3 * maxRing * (maxRing + 1);

  if (!Number.isSafeInteger(tileCount)) {
    throw new RangeError("hex map tile count exceeds the safe integer range");
  }

  return tileCount;
}

/**
 * 方法名：generateBaseMapCoordinates
 * 作用：执行该方法负责的单一业务操作。
 * @returns 本次处理得到的结果。
 */
export function generateBaseMapCoordinates(): readonly CubeCoordinate[] {
  const coordinates: CubeCoordinate[] = [];

  for (let x = -BASE_MAP_MAX_RING; x <= BASE_MAP_MAX_RING; x += 1) {
    for (let y = -BASE_MAP_MAX_RING; y <= BASE_MAP_MAX_RING; y += 1) {
      const z = -x - y;

      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= BASE_MAP_MAX_RING) {
        coordinates.push(createCubeCoordinate(x, y, z));
      }
    }
  }

  coordinates.sort(compareCoordinatesByRing);

  if (coordinates.length !== BASE_MAP_TILE_COUNT) {
    throw new Error(
      `base map generation produced ${coordinates.length} coordinates instead of ${BASE_MAP_TILE_COUNT}`,
    );
  }

  return coordinates;
}

/**
 * 方法名：compareCoordinatesByRing
 * 作用：执行该方法负责的单一业务操作。
 * @param first 方法所需的 first 参数。
 * @param second 方法所需的 second 参数。
 * @returns 本次处理得到的结果。
 */
function compareCoordinatesByRing(first: CubeCoordinate, second: CubeCoordinate): number {
  return (
    getCubeCoordinateRing(first) - getCubeCoordinateRing(second) ||
    first.x - second.x ||
    first.y - second.y ||
    first.z - second.z
  );
}
