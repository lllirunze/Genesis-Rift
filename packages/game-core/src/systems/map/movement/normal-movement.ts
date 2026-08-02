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

/** 描述当前模块对外公开的业务数据契约。 */
export type NormalMovementUnavailableReason = (typeof NORMAL_MOVEMENT_UNAVAILABLE_REASONS)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface NormalMovementCandidate {
  readonly available: true;
  readonly direction: HexDirection;
  readonly targetCoordinate: CubeCoordinate;
  readonly targetTile: HexTile;
  readonly ringRelation: RingMovementRelation;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface UnavailableNormalMovementDirection {
  readonly available: false;
  readonly direction: HexDirection;
  readonly targetCoordinate: CubeCoordinate;
  readonly reason: NormalMovementUnavailableReason;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type NormalMovementDirectionEvaluation =
  NormalMovementCandidate | UnavailableNormalMovementDirection;

/**
 * 方法名：evaluateNormalMovementDirections
 * 作用：执行该方法负责的单一业务操作。
 * @param map 方法所需的 map 参数。
 * @param originCoordinate 方法所需的 originCoordinate 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：getNormalMovementCandidates
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param map 方法所需的 map 参数。
 * @param originCoordinate 方法所需的 originCoordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function getNormalMovementCandidates(
  map: HexMap,
  originCoordinate: CubeCoordinate,
): readonly NormalMovementCandidate[] {
  return evaluateNormalMovementDirections(map, originCoordinate).filter(
    (evaluation): evaluation is NormalMovementCandidate => evaluation.available,
  );
}

/**
 * 方法名：evaluateNormalMovementDirection
 * 作用：执行该方法负责的单一业务操作。
 * @param map 方法所需的 map 参数。
 * @param originCoordinate 方法所需的 originCoordinate 参数。
 * @param direction 方法所需的 direction 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：requireOriginTile
 * 作用：执行该方法负责的单一业务操作。
 * @param map 方法所需的 map 参数。
 * @param originCoordinate 方法所需的 originCoordinate 参数。
 * @returns 本次处理得到的结果。
 */
function requireOriginTile(map: HexMap, originCoordinate: CubeCoordinate): HexTile {
  const originTile = map.getTileAt(originCoordinate);

  if (originTile === undefined) {
    throw new Error(
      `Normal movement origin is not a map tile: ${originCoordinate.x},${originCoordinate.y},${originCoordinate.z}`,
    );
  }

  return originTile;
}
