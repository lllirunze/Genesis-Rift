import type { CubeCoordinate } from "@genesis-rift/shared";

import { MAX_CUBE_COORDINATE, MIN_CUBE_COORDINATE } from "../map-config.ts";

/**
 * 方法名：createCubeCoordinate
 * 作用：创建并校验该方法所负责的业务对象。
 * @param x 方法所需的 x 参数。
 * @param y 方法所需的 y 参数。
 * @param z 方法所需的 z 参数。
 * @returns 本次处理得到的结果。
 */
export function createCubeCoordinate(x: number, y: number, z: number): CubeCoordinate {
  const coordinate = {
    x: normalizeCoordinateAxis(x),
    y: normalizeCoordinateAxis(y),
    z: normalizeCoordinateAxis(z),
  };

  validateCubeCoordinate(coordinate);
  return coordinate;
}

/**
 * 方法名：normalizeCoordinateAxis
 * 作用：执行该方法负责的单一业务操作。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
function normalizeCoordinateAxis(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

/**
 * 方法名：validateCubeCoordinate
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：getCubeCoordinateRing
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function getCubeCoordinateRing(coordinate: CubeCoordinate): number {
  validateCubeCoordinate(coordinate);

  return Math.max(Math.abs(coordinate.x), Math.abs(coordinate.y), Math.abs(coordinate.z));
}

/**
 * 方法名：getCubeCoordinateDistance
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param origin 方法所需的 origin 参数。
 * @param target 方法所需的 target 参数。
 * @returns 本次处理得到的结果。
 */
export function getCubeCoordinateDistance(origin: CubeCoordinate, target: CubeCoordinate): number {
  validateCubeCoordinate(origin);
  validateCubeCoordinate(target);

  return Math.max(
    Math.abs(target.x - origin.x),
    Math.abs(target.y - origin.y),
    Math.abs(target.z - origin.z),
  );
}

/**
 * 方法名：isHexMapCenter
 * 作用：判断输入是否满足当前业务条件。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function isHexMapCenter(coordinate: CubeCoordinate): boolean {
  validateCubeCoordinate(coordinate);

  return coordinate.x === 0 && coordinate.y === 0 && coordinate.z === 0;
}
