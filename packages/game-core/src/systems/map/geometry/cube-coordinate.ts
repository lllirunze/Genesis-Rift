import type { CubeCoordinate } from "@genesis-rift/shared";

export const BASE_MAP_MAX_RING = 10;
export const BOUNDARY_COORDINATE_OFFSET = 1;
export const MAX_CUBE_COORDINATE = BASE_MAP_MAX_RING + BOUNDARY_COORDINATE_OFFSET;
export const MIN_CUBE_COORDINATE = -MAX_CUBE_COORDINATE;

export const HEX_MAP_CENTER: CubeCoordinate = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
});

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
