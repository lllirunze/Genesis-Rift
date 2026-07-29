import type { CubeCoordinate } from "@genesis-rift/shared";

import { validateCubeCoordinate } from "./cube-coordinate.ts";

export type CubeCoordinateKey = `${number},${number},${number}`;

export function getCubeCoordinateKey(coordinate: CubeCoordinate): CubeCoordinateKey {
  validateCubeCoordinate(coordinate);

  return `${coordinate.x},${coordinate.y},${coordinate.z}`;
}
