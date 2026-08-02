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

/** 描述当前模块对外公开的业务数据契约。 */
export type HexDirection = (typeof HEX_DIRECTIONS)[number];

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface HexDirectionDefinition {
  readonly bearingDegrees: number;
  readonly vector: CubeCoordinate;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type RingMovementRelation = (typeof RING_MOVEMENT_RELATIONS)[number];

/**
 * 方法名：isNormalMapCoordinate
 * 作用：判断输入是否满足当前业务条件。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function isNormalMapCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) <= BASE_MAP_MAX_RING;
}

/**
 * 方法名：isMapBoundaryCoordinate
 * 作用：判断输入是否满足当前业务条件。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function isMapBoundaryCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) === BASE_MAP_MAX_RING;
}

/**
 * 方法名：isTheoreticalOuterBoundaryCoordinate
 * 作用：判断输入是否满足当前业务条件。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function isTheoreticalOuterBoundaryCoordinate(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return getCubeCoordinateRing(coordinate) === BASE_MAP_MAX_RING + 1;
}

/**
 * 方法名：getNeighborCoordinate
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param origin 方法所需的 origin 参数。
 * @param direction 方法所需的 direction 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：getNeighborCoordinates
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param origin 方法所需的 origin 参数。
 * @returns 本次处理得到的结果。
 */
export function getNeighborCoordinates(origin: CubeCoordinate): readonly CubeCoordinate[] {
  return HEX_DIRECTIONS.map((direction) => getNeighborCoordinate(origin, direction));
}

/**
 * 方法名：areCubeCoordinatesAdjacent
 * 作用：执行该方法负责的单一业务操作。
 * @param first 方法所需的 first 参数。
 * @param second 方法所需的 second 参数。
 * @returns 本次处理得到的结果。
 */
export function areCubeCoordinatesAdjacent(first: CubeCoordinate, second: CubeCoordinate): boolean {
  return getCubeCoordinateDistance(first, second) === 1;
}

/**
 * 方法名：getAdjacentRingMovementRelation
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param origin 方法所需的 origin 参数。
 * @param target 方法所需的 target 参数。
 * @returns 本次处理得到的结果。
 */
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
