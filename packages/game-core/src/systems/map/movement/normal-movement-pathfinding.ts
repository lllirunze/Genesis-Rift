import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import {
  isTileExplored,
  validatePlayerExplorationState,
  type PlayerExplorationState,
} from "../exploration/player-exploration-state.ts";
import type { HexDirection, RingMovementRelation } from "../geometry/hex-direction.ts";
import type { HexMap } from "../model/hex-map.ts";
import type { HexTile } from "../model/hex-tile.ts";
import {
  validateTerrainDefinitionCatalog,
  type TerrainDefinitionCatalog,
} from "../model/terrain-definition.ts";
import { calculateNormalMovementCost } from "./movement-cost-policy.ts";
import { getNormalMovementCandidates } from "./normal-movement.ts";
import type { NormalMovementRuleResolver } from "./normal-movement-rule.ts";

/** 描述普通移动寻路与可达区域查询共享的输入。 */
export interface NormalMovementPathfindingInput {
  readonly map: HexMap;
  readonly originTileId: TileId;
  readonly explorationState: PlayerExplorationState;
  readonly terrainDefinitions: TerrainDefinitionCatalog;
  readonly availableMovementPoints: number;
  readonly ruleResolver?: NormalMovementRuleResolver;
}

/** 描述查询指定普通移动目标时所需的输入。 */
export interface FindNormalMovementRouteInput extends NormalMovementPathfindingInput {
  readonly targetTileId: TileId;
}

/** 描述最低成本路线中的一步普通移动。 */
export interface NormalMovementRouteStep {
  readonly sequence: number;
  readonly direction: HexDirection;
  readonly originTileId: TileId;
  readonly targetTileId: TileId;
  readonly targetCoordinate: CubeCoordinate;
  readonly ringRelation: RingMovementRelation;
  readonly elevationDifference: number;
  readonly baseCost: number;
  readonly terrainCost: number;
  readonly uphillCost: number;
  readonly environmentCost: number;
  readonly movementCost: number;
  readonly accumulatedMovementCost: number;
  readonly isFirstExploration: boolean;
}

/** 描述一个终点对应的最低成本普通移动路线。 */
export interface NormalMovementRoute {
  readonly originTileId: TileId;
  readonly targetTileId: TileId;
  readonly directions: readonly HexDirection[];
  readonly steps: readonly NormalMovementRouteStep[];
  readonly paidMovementCost: number;
  readonly consumedMovementPoints: number;
  readonly remainingMovementPoints: number;
  readonly endsWithFirstExploration: boolean;
}

/** 描述当前移动力范围内所有可达终点及其最低成本路线。 */
export interface NormalMovementReachableArea {
  readonly originTileId: TileId;
  readonly availableMovementPoints: number;
  readonly routes: readonly NormalMovementRoute[];
}

/** 搜索过程中保存的最低成本节点记录。 */
interface SearchRecord {
  readonly tile: HexTile;
  readonly paidMovementCost: number;
  readonly stepCount: number;
  readonly discoveryOrder: number;
  readonly predecessorTileId: TileId | null;
  readonly incomingStep: Omit<NormalMovementRouteStep, "sequence"> | null;
  readonly endsWithFirstExploration: boolean;
}

/** 搜索结果同时保存起点与所有已发现的最低成本节点。 */
interface PathfindingSearchResult {
  readonly originTileId: TileId;
  readonly records: ReadonlyMap<TileId, SearchRecord>;
}

/**
 * 方法名：getReachableNormalMovementArea
 * 作用：查询当前移动力内可以通过普通移动抵达的全部终点及最低成本路线。
 * @param input 地图、起点、个人探索记录、地形配置与当前可用移动力。
 * @returns 不包含起点自身的可达路线集合，按成本、步数和地块标识稳定排序。
 * @throws 起点无效、起点尚未探索、移动力非法或地图配置非法时抛出错误。
 */
export function getReachableNormalMovementArea(
  input: NormalMovementPathfindingInput,
): NormalMovementReachableArea {
  const searchResult = searchNormalMovementRoutes(input);
  const routes = [...searchResult.records.values()]
    .filter((record) => record.tile.tileId !== input.originTileId)
    .map((record) => createRoute(input, searchResult, record))
    .sort(compareRoutes);

  return Object.freeze({
    originTileId: input.originTileId,
    availableMovementPoints: input.availableMovementPoints,
    routes: Object.freeze(routes),
  });
}

/**
 * 方法名：findNormalMovementRoute
 * 作用：查询起点至指定目标地块的最低移动成本路线。
 * @param input 地图、起点、目标、探索记录、地形配置与当前可用移动力。
 * @returns 目标可达时返回最低成本路线，否则返回 null。
 * @throws 起点或目标不存在、起点尚未探索、移动力非法或地图配置非法时抛出错误。
 */
export function findNormalMovementRoute(
  input: FindNormalMovementRouteInput,
): NormalMovementRoute | null {
  if (input.map.getTileById(input.targetTileId) === undefined) {
    throw new Error(`Normal movement target tile does not exist: ${input.targetTileId}`);
  }

  const searchResult = searchNormalMovementRoutes(input);
  const targetRecord = searchResult.records.get(input.targetTileId);

  return targetRecord === undefined ? null : createRoute(input, searchResult, targetRecord);
}

/**
 * 方法名：searchNormalMovementRoutes
 * 作用：使用最低成本优先搜索计算移动力范围内每个地块的最优前驱记录。
 * @param input 地图、起点、探索记录、地形配置与当前可用移动力。
 * @returns 起点及全部可达终点的最低成本搜索记录。
 * @throws 起点无效、起点尚未探索、移动力非法或地图配置非法时抛出错误。
 */
function searchNormalMovementRoutes(
  input: NormalMovementPathfindingInput,
): PathfindingSearchResult {
  assertNonNegativeSafeInteger(input.availableMovementPoints, "availableMovementPoints");
  validateTerrainDefinitionCatalog(input.terrainDefinitions);
  validatePlayerExplorationState(input.explorationState, input.map);

  const originTile = input.map.getTileById(input.originTileId);

  if (originTile === undefined) {
    throw new Error(`Normal movement origin tile does not exist: ${input.originTileId}`);
  }

  if (!isTileExplored(input.explorationState, input.originTileId)) {
    throw new Error(`Normal movement origin tile has not been explored: ${input.originTileId}`);
  }

  let nextDiscoveryOrder = 1;
  const originRecord: SearchRecord = {
    tile: originTile,
    paidMovementCost: 0,
    stepCount: 0,
    discoveryOrder: 0,
    predecessorTileId: null,
    incomingStep: null,
    endsWithFirstExploration: false,
  };
  const records = new Map<TileId, SearchRecord>([[originTile.tileId, originRecord]]);
  const pendingRecords: SearchRecord[] = [originRecord];
  const expandedTileIds = new Set<TileId>();

  while (pendingRecords.length > 0) {
    const currentRecord = takeNextRecord(pendingRecords);

    if (expandedTileIds.has(currentRecord.tile.tileId)) {
      continue;
    }

    expandedTileIds.add(currentRecord.tile.tileId);

    for (const candidate of getNormalMovementCandidates(
      input.map,
      currentRecord.tile.coordinate,
      input.ruleResolver,
    )) {
      const movementCost = calculateNormalMovementCost(
        currentRecord.tile,
        candidate.targetTile,
        input.terrainDefinitions,
        input.ruleResolver,
      );
      const paidMovementCost = currentRecord.paidMovementCost + movementCost.totalCost;

      if (paidMovementCost > input.availableMovementPoints) {
        continue;
      }

      const isFirstExploration = !isTileExplored(
        input.explorationState,
        candidate.targetTile.tileId,
      );
      const existingRecord = records.get(candidate.targetTile.tileId);
      const stepCount = currentRecord.stepCount + 1;

      if (!isBetterRoute(paidMovementCost, stepCount, existingRecord)) {
        continue;
      }

      const nextRecord: SearchRecord = {
        tile: candidate.targetTile,
        paidMovementCost,
        stepCount,
        discoveryOrder: nextDiscoveryOrder,
        predecessorTileId: currentRecord.tile.tileId,
        incomingStep: {
          direction: candidate.direction,
          originTileId: currentRecord.tile.tileId,
          targetTileId: candidate.targetTile.tileId,
          targetCoordinate: candidate.targetCoordinate,
          ringRelation: candidate.ringRelation,
          elevationDifference: movementCost.elevationDifference,
          baseCost: movementCost.baseCost,
          terrainCost: movementCost.terrainCost,
          uphillCost: movementCost.uphillCost,
          environmentCost: movementCost.environmentCost,
          movementCost: movementCost.totalCost,
          accumulatedMovementCost: paidMovementCost,
          isFirstExploration,
        },
        endsWithFirstExploration: isFirstExploration,
      };

      nextDiscoveryOrder += 1;
      records.set(candidate.targetTile.tileId, nextRecord);

      // 未探索地块只能作为路线终点，不能继续展开其相邻节点。
      if (!isFirstExploration) {
        pendingRecords.push(nextRecord);
      }
    }
  }

  return {
    originTileId: originTile.tileId,
    records,
  };
}

/**
 * 方法名：takeNextRecord
 * 作用：从待处理记录中取出成本最低、步数最少且最早发现的节点。
 * @param pendingRecords 尚未完成扩展的搜索记录数组。
 * @returns 下一条需要扩展的最低成本记录。
 */
function takeNextRecord(pendingRecords: SearchRecord[]): SearchRecord {
  let bestIndex = 0;

  for (let index = 1; index < pendingRecords.length; index += 1) {
    if (compareSearchRecords(pendingRecords[index]!, pendingRecords[bestIndex]!) < 0) {
      bestIndex = index;
    }
  }

  return pendingRecords.splice(bestIndex, 1)[0]!;
}

/**
 * 方法名：isBetterRoute
 * 作用：判断新路线是否比目标地块当前记录拥有更低成本或更少步数。
 * @param paidMovementCost 新路线累计需要支付的移动成本。
 * @param stepCount 新路线包含的移动步数。
 * @param existingRecord 目标地块当前已有的最低成本记录。
 * @returns 新路线应替换当前记录时返回 true。
 */
function isBetterRoute(
  paidMovementCost: number,
  stepCount: number,
  existingRecord: SearchRecord | undefined,
): boolean {
  if (existingRecord === undefined) {
    return true;
  }

  if (paidMovementCost !== existingRecord.paidMovementCost) {
    return paidMovementCost < existingRecord.paidMovementCost;
  }

  return stepCount < existingRecord.stepCount;
}

/**
 * 方法名：createRoute
 * 作用：根据目标节点的前驱链还原可直接交给移动结算器使用的方向与步骤序列。
 * @param input 本次寻路使用的基础输入。
 * @param searchResult 已完成的最低成本搜索结果。
 * @param targetRecord 需要还原路线的目标节点记录。
 * @returns 包含逐步成本、方向序列与首次探索信息的不可变路线。
 */
function createRoute(
  input: NormalMovementPathfindingInput,
  searchResult: PathfindingSearchResult,
  targetRecord: SearchRecord,
): NormalMovementRoute {
  const reversedSteps: Omit<NormalMovementRouteStep, "sequence">[] = [];
  let currentRecord = targetRecord;

  while (currentRecord.predecessorTileId !== null) {
    if (currentRecord.incomingStep === null) {
      throw new Error(
        `Pathfinding record is missing its incoming step: ${currentRecord.tile.tileId}`,
      );
    }

    reversedSteps.push(currentRecord.incomingStep);

    const predecessorRecord = searchResult.records.get(currentRecord.predecessorTileId);

    if (predecessorRecord === undefined) {
      throw new Error(
        `Pathfinding record is missing predecessor: ${currentRecord.predecessorTileId}`,
      );
    }

    currentRecord = predecessorRecord;
  }

  const steps = reversedSteps.reverse().map((step, index) =>
    Object.freeze({
      ...step,
      sequence: index + 1,
    }),
  );
  const consumedMovementPoints = targetRecord.endsWithFirstExploration
    ? input.availableMovementPoints
    : targetRecord.paidMovementCost;

  return Object.freeze({
    originTileId: searchResult.originTileId,
    targetTileId: targetRecord.tile.tileId,
    directions: Object.freeze(steps.map((step) => step.direction)),
    steps: Object.freeze(steps),
    paidMovementCost: targetRecord.paidMovementCost,
    consumedMovementPoints,
    remainingMovementPoints: input.availableMovementPoints - consumedMovementPoints,
    endsWithFirstExploration: targetRecord.endsWithFirstExploration,
  });
}

/**
 * 方法名：compareSearchRecords
 * 作用：按照累计成本、步数和发现顺序稳定比较两条待扩展记录。
 * @param first 第一条搜索记录。
 * @param second 第二条搜索记录。
 * @returns 小于零表示第一条记录应优先处理。
 */
function compareSearchRecords(first: SearchRecord, second: SearchRecord): number {
  return (
    first.paidMovementCost - second.paidMovementCost ||
    first.stepCount - second.stepCount ||
    first.discoveryOrder - second.discoveryOrder
  );
}

/**
 * 方法名：compareRoutes
 * 作用：按照成本、步数和地块标识为可达区域结果提供稳定顺序。
 * @param first 第一条可达路线。
 * @param second 第二条可达路线。
 * @returns 小于零表示第一条路线应排列在前。
 */
function compareRoutes(first: NormalMovementRoute, second: NormalMovementRoute): number {
  const numericComparison =
    first.paidMovementCost - second.paidMovementCost || first.steps.length - second.steps.length;

  if (numericComparison !== 0) {
    return numericComparison;
  }

  const firstTileId = String(first.targetTileId);
  const secondTileId = String(second.targetTileId);

  return firstTileId < secondTileId ? -1 : firstTileId > secondTileId ? 1 : 0;
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验数值是否为可安全参与寻路计算的非负整数。
 * @param value 需要校验的数值。
 * @param name 出现在错误信息中的参数名称。
 * @returns 无返回值。
 * @throws 数值不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}
