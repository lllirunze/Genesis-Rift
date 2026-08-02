import type { CubeCoordinate } from "@genesis-rift/shared";

import { getCubeCoordinateKey } from "./cube-coordinate-key.ts";
import {
  createCubeCoordinate,
  getCubeCoordinateDistance,
  validateCubeCoordinate,
} from "./cube-coordinate.ts";
import { areCubeCoordinatesAdjacent } from "./hex-direction.ts";

/**
 * 方法名：getHexLineBranches
 * 作用：生成两个六边形中心之间的标准直线覆盖分支，不允许像寻路一样主动绕行。
 * @param origin 视线起点的立方体坐标。
 * @param target 视线终点的立方体坐标。
 * @returns 一条或多条稳定排序的直线坐标序列，每条序列均包含起点和终点。
 */
export function getHexLineBranches(
  origin: CubeCoordinate,
  target: CubeCoordinate,
): readonly (readonly CubeCoordinate[])[] {
  validateCubeCoordinate(origin);
  validateCubeCoordinate(target);

  const distance = getCubeCoordinateDistance(origin, target);

  if (distance === 0) {
    return Object.freeze([Object.freeze([origin])]);
  }

  let branches: readonly (readonly CubeCoordinate[])[] = [Object.freeze([origin])];

  for (let step = 1; step <= distance; step += 1) {
    const candidates = getRoundedCoordinateCandidates(origin, target, step, distance);
    const nextBranches: CubeCoordinate[][] = [];

    for (const branch of branches) {
      const previousCoordinate = branch[branch.length - 1]!;

      for (const candidate of candidates) {
        if (!areCubeCoordinatesAdjacent(previousCoordinate, candidate)) {
          continue;
        }

        nextBranches.push([...branch, candidate]);
      }
    }

    branches = deduplicateBranches(nextBranches);
  }

  return Object.freeze(
    branches
      .filter((branch) => coordinatesEqual(branch[branch.length - 1]!, target))
      .map((branch) => Object.freeze(branch)),
  );
}

/**
 * 方法名：getRoundedCoordinateCandidates
 * 作用：使用整数分数插值，计算直线在指定步长上所有距离相同的六边形候选格。
 * @param origin 直线起点坐标。
 * @param target 直线终点坐标。
 * @param step 当前插值步长。
 * @param distance 起点和终点之间的六边形距离，同时作为分数分母。
 * @returns 与理论插值点距离最近的一个或多个合法立方体坐标。
 */
function getRoundedCoordinateCandidates(
  origin: CubeCoordinate,
  target: CubeCoordinate,
  step: number,
  distance: number,
): readonly CubeCoordinate[] {
  const remainingSteps = distance - step;
  const numerators = {
    x: origin.x * remainingSteps + target.x * step,
    y: origin.y * remainingSteps + target.y * step,
    z: origin.z * remainingSteps + target.z * step,
  };
  const xValues = getFloorAndCeiling(numerators.x, distance);
  const yValues = getFloorAndCeiling(numerators.y, distance);
  const zValues = getFloorAndCeiling(numerators.z, distance);
  const scoredCandidates: { readonly coordinate: CubeCoordinate; readonly score: number }[] = [];

  for (const x of xValues) {
    for (const y of yValues) {
      for (const z of zValues) {
        if (x + y + z !== 0) {
          continue;
        }

        const xError = x * distance - numerators.x;
        const yError = y * distance - numerators.y;
        const zError = z * distance - numerators.z;

        scoredCandidates.push({
          coordinate: createCubeCoordinate(x, y, z),
          score: xError ** 2 + yError ** 2 + zError ** 2,
        });
      }
    }
  }

  const minimumScore = Math.min(...scoredCandidates.map((candidate) => candidate.score));

  return Object.freeze(
    scoredCandidates
      .filter((candidate) => candidate.score === minimumScore)
      .map((candidate) => candidate.coordinate),
  );
}

/**
 * 方法名：getFloorAndCeiling
 * 作用：获取一个整数分数可能采用的向下与向上取整值。
 * @param numerator 整数分子。
 * @param denominator 正整数分母。
 * @returns 分数为整数时返回单值，否则返回向下和向上两个候选值。
 */
function getFloorAndCeiling(numerator: number, denominator: number): readonly number[] {
  const floor = Math.floor(numerator / denominator);
  const ceiling = Math.ceil(numerator / denominator);

  return floor === ceiling ? [floor] : [floor, ceiling];
}

/**
 * 方法名：deduplicateBranches
 * 作用：按完整坐标序列去除边界分支生成过程中出现的重复路径。
 * @param branches 当前步长生成的全部候选分支。
 * @returns 保留首次出现顺序的唯一分支集合。
 */
function deduplicateBranches(
  branches: readonly (readonly CubeCoordinate[])[],
): readonly CubeCoordinate[][] {
  const uniqueBranches = new Map<string, CubeCoordinate[]>();

  for (const branch of branches) {
    const branchKey = branch.map(getCubeCoordinateKey).join("|");

    if (!uniqueBranches.has(branchKey)) {
      uniqueBranches.set(branchKey, [...branch]);
    }
  }

  return [...uniqueBranches.values()];
}

/**
 * 方法名：coordinatesEqual
 * 作用：判断两个立方体坐标是否指向同一个六边形地块。
 * @param first 第一个立方体坐标。
 * @param second 第二个立方体坐标。
 * @returns 三个坐标轴均相等时返回 true。
 */
function coordinatesEqual(first: CubeCoordinate, second: CubeCoordinate): boolean {
  return first.x === second.x && first.y === second.y && first.z === second.z;
}
