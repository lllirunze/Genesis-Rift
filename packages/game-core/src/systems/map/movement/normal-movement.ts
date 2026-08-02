import type { CubeCoordinate } from "@genesis-rift/shared";

import {
  getAdjacentRingMovementRelation,
  getNeighborCoordinate,
  type HexDirection,
  isNormalMapCoordinate,
  type RingMovementRelation,
} from "../geometry/hex-direction.ts";
import { HEX_DIRECTIONS } from "../map-config.ts";
import type { HexMap } from "../model/hex-map.ts";
import type { HexTile } from "../model/hex-tile.ts";
import { NORMAL_MOVEMENT_UNAVAILABLE_REASONS } from "./movement-config.ts";

export type NormalMovementUnavailableReason = (typeof NORMAL_MOVEMENT_UNAVAILABLE_REASONS)[number];

export interface NormalMovementCandidate {
  readonly available: true;
  readonly direction: HexDirection;
  readonly targetCoordinate: CubeCoordinate;
  readonly targetTile: HexTile;
  readonly ringRelation: RingMovementRelation;
}

export interface UnavailableNormalMovementDirection {
  readonly available: false;
  readonly direction: HexDirection;
  readonly targetCoordinate: CubeCoordinate;
  readonly reason: NormalMovementUnavailableReason;
}

export type NormalMovementDirectionEvaluation =
  NormalMovementCandidate | UnavailableNormalMovementDirection;

export function evaluateNormalMovementDirections(
  map: HexMap,
  originCoordinate: CubeCoordinate,
): readonly NormalMovementDirectionEvaluation[] {
  requireOriginTile(map, originCoordinate);

  return Object.freeze(
    HEX_DIRECTIONS.map((direction) =>
      evaluateNormalMovementDirection(map, originCoordinate, direction),
    ),
  );
}

export function getNormalMovementCandidates(
  map: HexMap,
  originCoordinate: CubeCoordinate,
): readonly NormalMovementCandidate[] {
  return evaluateNormalMovementDirections(map, originCoordinate).filter(
    (evaluation): evaluation is NormalMovementCandidate => evaluation.available,
  );
}

function evaluateNormalMovementDirection(
  map: HexMap,
  originCoordinate: CubeCoordinate,
  direction: HexDirection,
): NormalMovementDirectionEvaluation {
  const targetCoordinate = getNeighborCoordinate(originCoordinate, direction);

  if (!isNormalMapCoordinate(targetCoordinate)) {
    return Object.freeze({
      available: false,
      direction,
      targetCoordinate,
      reason: "OUTSIDE_MAP",
    });
  }

  const targetTile = map.getTileAt(targetCoordinate);

  if (targetTile === undefined) {
    throw new Error(
      `Hex map is missing normal coordinate: ${targetCoordinate.x},${targetCoordinate.y},${targetCoordinate.z}`,
    );
  }

  if (targetTile.passability === "blocked") {
    return Object.freeze({
      available: false,
      direction,
      targetCoordinate,
      reason: "BLOCKED",
    });
  }

  return Object.freeze({
    available: true,
    direction,
    targetCoordinate,
    targetTile,
    ringRelation: getAdjacentRingMovementRelation(originCoordinate, targetCoordinate),
  });
}

function requireOriginTile(map: HexMap, originCoordinate: CubeCoordinate): HexTile {
  const originTile = map.getTileAt(originCoordinate);

  if (originTile === undefined) {
    throw new Error(
      `Normal movement origin is not a map tile: ${originCoordinate.x},${originCoordinate.y},${originCoordinate.z}`,
    );
  }

  return originTile;
}
