import type { CubeCoordinate } from "@genesis-rift/shared";

import { MAX_CUBE_COORDINATE, MIN_CUBE_COORDINATE } from "../map-config.ts";

export function createCubeCoordinate(x: number, y: number, z: number): CubeCoordinate {
  const coordinate = {
    x: normalizeCoordinateAxis(x),
    y: normalizeCoordinateAxis(y),
    z: normalizeCoordinateAxis(z),
  };

  validateCubeCoordinate(coordinate);
  return coordinate;
}

function normalizeCoordinateAxis(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function validateCubeCoordinate(coordinate: CubeCoordinate): void {
  for (const [axis, value] of Object.entries(coordinate)) {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(`cube coordinate ${axis} must be a safe integer`);
    }
  }

  if (coordinate.x + coordinate.y + coordinate.z !== 0) {
    throw new RangeError("cube coordinates must satisfy x + y + z = 0");
  }

  for (const [axis, value] of Object.entries(coordinate)) {
    if (value < MIN_CUBE_COORDINATE || value > MAX_CUBE_COORDINATE) {
      throw new RangeError(
        `cube coordinate ${axis} must be between ${MIN_CUBE_COORDINATE} and ${MAX_CUBE_COORDINATE}`,
      );
    }
  }
}

export function getCubeCoordinateRing(coordinate: CubeCoordinate): number {
  validateCubeCoordinate(coordinate);

  return Math.max(Math.abs(coordinate.x), Math.abs(coordinate.y), Math.abs(coordinate.z));
}

export function getCubeCoordinateDistance(origin: CubeCoordinate, target: CubeCoordinate): number {
  validateCubeCoordinate(origin);
  validateCubeCoordinate(target);

  return Math.max(
    Math.abs(target.x - origin.x),
    Math.abs(target.y - origin.y),
    Math.abs(target.z - origin.z),
  );
}

export function isHexMapCenter(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return coordinate.x === 0 && coordinate.y === 0 && coordinate.z === 0;
}
