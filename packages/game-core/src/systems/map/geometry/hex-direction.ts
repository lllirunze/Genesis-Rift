import type { CubeCoordinate } from "@genesis-rift/shared";

import {
  BASE_MAP_MAX_RING,
  createCubeCoordinate,
  getCubeCoordinateDistance,
  getCubeCoordinateRing,
  validateCubeCoordinate,
} from "./cube-coordinate.ts";

export const HEX_DIRECTIONS = [
  "NORTH",
  "NORTH_EAST_60",
  "SOUTH_EAST_60",
  "SOUTH",
  "SOUTH_WEST_60",
  "NORTH_WEST_60",
] as const;

export type HexDirection = (typeof HEX_DIRECTIONS)[number];

export interface HexDirectionDefinition {
  readonly bearingDegrees: number;
  readonly vector: CubeCoordinate;
}

export const HEX_DIRECTION_DEFINITIONS: Readonly<Record<HexDirection, HexDirectionDefinition>> = {
  NORTH: { bearingDegrees: 0, vector: { x: 0, y: 1, z: -1 } },
  NORTH_EAST_60: { bearingDegrees: 60, vector: { x: 1, y: 0, z: -1 } },
  SOUTH_EAST_60: { bearingDegrees: 120, vector: { x: 1, y: -1, z: 0 } },
  SOUTH: { bearingDegrees: 180, vector: { x: 0, y: -1, z: 1 } },
  SOUTH_WEST_60: { bearingDegrees: 240, vector: { x: -1, y: 0, z: 1 } },
  NORTH_WEST_60: { bearingDegrees: 300, vector: { x: -1, y: 1, z: 0 } },
};

export const RING_MOVEMENT_RELATIONS = ["INWARD", "SAME_RING", "OUTWARD"] as const;

export type RingMovementRelation = (typeof RING_MOVEMENT_RELATIONS)[number];

export function isNormalMapCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) <= BASE_MAP_MAX_RING;
}

export function isMapBoundaryCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) === BASE_MAP_MAX_RING;
}

export function isTheoreticalOuterBoundaryCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) === BASE_MAP_MAX_RING + 1;
}

export function getNeighborCoordinate(
  origin: CubeCoordinate,
  direction: HexDirection,
): CubeCoordinate {
  if (!isNormalMapCoordinate(origin)) {
    throw new RangeError("neighbor origin must be a normal map coordinate");
  }

  const vector = HEX_DIRECTION_DEFINITIONS[direction].vector;

  return createCubeCoordinate(origin.x + vector.x, origin.y + vector.y, origin.z + vector.z);
}

export function getNeighborCoordinates(origin: CubeCoordinate): readonly CubeCoordinate[] {
  return HEX_DIRECTIONS.map((direction) => getNeighborCoordinate(origin, direction));
}

export function areCubeCoordinatesAdjacent(first: CubeCoordinate, second: CubeCoordinate): boolean {
  return getCubeCoordinateDistance(first, second) === 1;
}

export function getAdjacentRingMovementRelation(
  origin: CubeCoordinate,
  target: CubeCoordinate,
): RingMovementRelation {
  if (!areCubeCoordinatesAdjacent(origin, target)) {
    throw new RangeError("ring movement relation requires adjacent coordinates");
  }

  const originRing = getCubeCoordinateRing(origin);
  const targetRing = getCubeCoordinateRing(target);

  if (targetRing < originRing) {
    return "INWARD";
  }

  if (targetRing > originRing) {
    return "OUTWARD";
  }

  return "SAME_RING";
}
