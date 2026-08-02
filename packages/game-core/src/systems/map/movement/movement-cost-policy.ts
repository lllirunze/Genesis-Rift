import type { HexTile } from "../model/hex-tile.ts";
import {
  getTerrainDefinition,
  type TerrainDefinitionCatalog,
  validateTerrainDefinition,
} from "../model/terrain-definition.ts";
import {
  MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE,
  NORMAL_MOVEMENT_STEP_COST,
} from "./movement-config.ts";

/** 描述进入一个相邻目标地块时各部分移动成本。 */
export interface NormalMovementCost {
  readonly elevationDifference: number;
  readonly baseCost: number;
  readonly terrainCost: number;
  readonly uphillCost: number;
  readonly totalCost: number;
}

/**
 * 方法名：calculateNormalMovementCost
 * 作用：根据目标地形与相邻地块高度差计算一次普通移动的整数成本。
 * @param originTile 玩家当前所在的地块。
 * @param targetTile 玩家准备进入的相邻目标地块。
 * @param terrainDefinitions 基础地形静态定义注册表。
 * @returns 基础、目标地形、上坡和总移动成本。
 * @throws 高度差超过普通移动限制或地形配置不存在时抛出错误。
 */
export function calculateNormalMovementCost(
  originTile: HexTile,
  targetTile: HexTile,
  terrainDefinitions: TerrainDefinitionCatalog,
): NormalMovementCost {
  const elevationDifference = targetTile.elevation - originTile.elevation;

  if (Math.abs(elevationDifference) > MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE) {
    throw new RangeError(
      `Normal movement elevation difference must be between -${MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE} and ${MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE}`,
    );
  }

  const targetTerrain = getTerrainDefinition(terrainDefinitions, targetTile.terrainDefinitionId);
  validateTerrainDefinition(targetTerrain);
  const uphillCost = elevationDifference > 0 ? elevationDifference ** 2 : 0;
  const totalCost = NORMAL_MOVEMENT_STEP_COST + targetTerrain.movementCostModifier + uphillCost;

  return Object.freeze({
    elevationDifference,
    baseCost: NORMAL_MOVEMENT_STEP_COST,
    terrainCost: targetTerrain.movementCostModifier,
    uphillCost,
    totalCost,
  });
}
