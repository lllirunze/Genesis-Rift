import type { CubeCoordinate } from "@genesis-rift/shared";

import {
  BASE_MAP_MAX_RING,
  HEX_DIRECTION_DEFINITIONS,
  HEX_DIRECTIONS,
  RING_MOVEMENT_RELATIONS,
} from "../map-config.ts";
import {
  createCubeCoordinate,
  getCubeCoordinateDistance,
  getCubeCoordinateRing,
  validateCubeCoordinate,
} from "./cube-coordinate.ts";

export type HexDirection = (typeof HEX_DIRECTIONS)[number];

export interface HexDirectionDefinition {
  readonly bearingDegrees: number;
  readonly vector: CubeCoordinate;
}

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
