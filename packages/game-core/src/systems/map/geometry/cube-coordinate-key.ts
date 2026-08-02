import type { CubeCoordinate } from "@genesis-rift/shared";

import { validateCubeCoordinate } from "./cube-coordinate.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type CubeCoordinateKey = `${number},${number},${number}`;

/**
 * 方法名：getCubeCoordinateKey
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param coordinate 方法所需的 coordinate 参数。
 * @returns 本次处理得到的结果。
 */
export function getCubeCoordinateKey(coordinate: CubeCoordinate): CubeCoordinateKey {
  validateCubeCoordinate(coordinate);

  return `${coordinate.x},${coordinate.y},${coordinate.z}`;
}
