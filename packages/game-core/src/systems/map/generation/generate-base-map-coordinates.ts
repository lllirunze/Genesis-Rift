import type { CubeCoordinate } from "@genesis-rift/shared";

import {
  BASE_MAP_MAX_RING,
  createCubeCoordinate,
  getCubeCoordinateRing,
} from "../geometry/cube-coordinate.ts";

export const BASE_MAP_TILE_COUNT = getCompleteHexMapTileCount(BASE_MAP_MAX_RING);

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

function compareCoordinatesByRing(first: CubeCoordinate, second: CubeCoordinate): number {
  return (
    getCubeCoordinateRing(first) - getCubeCoordinateRing(second) ||
    first.x - second.x ||
    first.y - second.y ||
    first.z - second.z
  );
}
