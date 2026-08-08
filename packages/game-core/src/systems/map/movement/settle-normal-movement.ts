import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import {
  isTileExplored,
  recordSuccessfulTileEntry,
  validatePlayerExplorationState,
  type PlayerExplorationState,
} from "../exploration/player-exploration-state.ts";
import type { HexDirection, RingMovementRelation } from "../geometry/hex-direction.ts";
import type { HexMap } from "../model/hex-map.ts";
import {
  validateTerrainDefinitionCatalog,
  type TerrainDefinitionCatalog,
} from "../model/terrain-definition.ts";
import { calculateNormalMovementCost } from "./movement-cost-policy.ts";
import { NORMAL_MOVEMENT_SETTLEMENT_OUTCOMES } from "./movement-config.ts";
import type { NormalMovementRuleResolver } from "./normal-movement-rule.ts";
import {
  evaluateNormalMovementDirections,
  type NormalMovementDirectionEvaluation,
} from "./normal-movement.ts";

/** 一次普通移动结算可能产生的最终结果。 */
export type NormalMovementSettlementOutcome = (typeof NORMAL_MOVEMENT_SETTLEMENT_OUTCOMES)[number];

/** 描述一次普通移动结算的完整输入。 */
export interface SettleNormalMovementInput {
  readonly map: HexMap;
  readonly currentTileId: TileId;
  readonly explorationState: PlayerExplorationState;
  readonly terrainDefinitions: TerrainDefinitionCatalog;
  readonly availableMovementPoints: number;
  readonly directions: readonly HexDirection[];
  readonly ruleResolver?: NormalMovementRuleResolver;
}

/** 描述玩家成功完成的一步普通移动。 */
export interface SettledNormalMovementStep {
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
  readonly remainingMovementPoints: number;
  readonly isFirstExploration: boolean;
}

/** 描述未能执行的下一步移动及其失败原因。 */
export interface NormalMovementInterruption {
  readonly reason: "insufficient_movement" | "blocked" | "outside_map" | "elevation_difference";
  readonly direction: HexDirection;
  readonly targetCoordinate: CubeCoordinate;
}

/** 描述普通移动完成后的最终位置、消耗和探索状态。 */
export interface SettleNormalMovementResult {
  readonly outcome: NormalMovementSettlementOutcome;
  readonly initialTileId: TileId;
  readonly finalTileId: TileId;
  readonly initialMovementPoints: number;
  readonly remainingMovementPoints: number;
  readonly paidMovementCost: number;
  readonly consumedMovementPoints: number;
  readonly steps: readonly SettledNormalMovementStep[];
  readonly explorationState: PlayerExplorationState;
  readonly interruption: NormalMovementInterruption | null;
}

/**
 * 方法名：settleNormalMovement
 * 作用：按照方向序列逐格结算普通移动，并在首次探索后清空剩余移动力。
 * @param input 地图、当前位置、探索记录、可用移动力与计划方向序列。
 * @returns 最终位置、实际路径、移动消耗、探索状态及中断原因。
 * @throws 输入移动力无效、当前位置不存在或当前位置尚未探索时抛出错误。
 */
export function settleNormalMovement(input: SettleNormalMovementInput): SettleNormalMovementResult {
  assertNonNegativeSafeInteger(input.availableMovementPoints, "availableMovementPoints");
  validateTerrainDefinitionCatalog(input.terrainDefinitions);
  validatePlayerExplorationState(input.explorationState, input.map);

  const initialTile = input.map.getTileById(input.currentTileId);

  if (initialTile === undefined) {
    throw new Error(`Normal movement current tile does not exist: ${input.currentTileId}`);
  }

  if (!isTileExplored(input.explorationState, input.currentTileId)) {
    throw new Error(`Normal movement current tile has not been explored: ${input.currentTileId}`);
  }

  let currentTile = initialTile;
  let explorationState = input.explorationState;
  let remainingMovementPoints = input.availableMovementPoints;
  let paidMovementCost = 0;
  const steps: SettledNormalMovementStep[] = [];

  for (const direction of input.directions) {
    const evaluation = getDirectionEvaluation(
      input.map,
      currentTile.coordinate,
      direction,
      input.ruleResolver,
    );

    if (!evaluation.available) {
      return createInterruptedResult(
        input,
        currentTile.tileId,
        explorationState,
        remainingMovementPoints,
        paidMovementCost,
        steps,
        {
          reason:
            evaluation.reason === "BLOCKED" || evaluation.reason === "ENVIRONMENT_BLOCKED"
              ? "blocked"
              : evaluation.reason === "ELEVATION_DIFFERENCE"
                ? "elevation_difference"
                : "outside_map",
          direction,
          targetCoordinate: evaluation.targetCoordinate,
        },
      );
    }

    const movementCost = calculateNormalMovementCost(
      currentTile,
      evaluation.targetTile,
      input.terrainDefinitions,
      input.ruleResolver,
    );

    if (remainingMovementPoints < movementCost.totalCost) {
      return createInterruptedResult(
        input,
        currentTile.tileId,
        explorationState,
        remainingMovementPoints,
        paidMovementCost,
        steps,
        {
          reason: "insufficient_movement",
          direction,
          targetCoordinate: evaluation.targetCoordinate,
        },
      );
    }

    const originTileId = currentTile.tileId;
    const entry = recordSuccessfulTileEntry(
      explorationState,
      evaluation.targetTile.tileId,
      input.map,
    );
    paidMovementCost += movementCost.totalCost;
    remainingMovementPoints -= movementCost.totalCost;
    explorationState = entry.explorationState;
    currentTile = evaluation.targetTile;

    if (entry.isFirstExploration) {
      remainingMovementPoints = 0;
    }

    steps.push(
      Object.freeze({
        sequence: steps.length + 1,
        direction,
        originTileId,
        targetTileId: currentTile.tileId,
        targetCoordinate: currentTile.coordinate,
        ringRelation: evaluation.ringRelation,
        elevationDifference: movementCost.elevationDifference,
        baseCost: movementCost.baseCost,
        terrainCost: movementCost.terrainCost,
        uphillCost: movementCost.uphillCost,
        environmentCost: movementCost.environmentCost,
        movementCost: movementCost.totalCost,
        remainingMovementPoints,
        isFirstExploration: entry.isFirstExploration,
      }),
    );

    if (entry.isFirstExploration) {
      return createResult(
        "first_exploration",
        input,
        currentTile.tileId,
        explorationState,
        remainingMovementPoints,
        paidMovementCost,
        steps,
        null,
      );
    }
  }

  return createResult(
    "completed",
    input,
    currentTile.tileId,
    explorationState,
    remainingMovementPoints,
    paidMovementCost,
    steps,
    null,
  );
}

/**
 * 方法名：getDirectionEvaluation
 * 作用：读取当前位置在指定方向上的普通移动候选结果。
 * @param map 当前六边形地图。
 * @param originCoordinate 当前地块的立方体坐标。
 * @param direction 玩家计划执行的移动方向。
 * @param ruleResolver 天气、区域或状态系统提供的可选普通移动规则解析器。
 * @returns 指定方向对应的可用或不可用结果。
 * @throws 方向不属于当前六方向配置时抛出错误。
 */
function getDirectionEvaluation(
  map: HexMap,
  originCoordinate: CubeCoordinate,
  direction: HexDirection,
  ruleResolver?: NormalMovementRuleResolver,
): NormalMovementDirectionEvaluation {
  const evaluation = evaluateNormalMovementDirections(map, originCoordinate, ruleResolver).find(
    (candidate) => candidate.direction === direction,
  );

  if (evaluation === undefined) {
    throw new RangeError(`Unsupported normal movement direction: ${direction as string}`);
  }

  return evaluation;
}

/**
 * 方法名：createInterruptedResult
 * 作用：将无法执行的下一步转换为不修改既有成功步骤的移动结算结果。
 * @param input 本次普通移动的原始输入。
 * @param finalTileId 最后成功停留的地块标识。
 * @param explorationState 已完成步骤产生的探索状态。
 * @param remainingMovementPoints 中断时剩余的移动力。
 * @param paidMovementCost 已成功进入地块所支付的基础成本。
 * @param steps 已成功执行的移动步骤。
 * @param interruption 未能执行的方向及具体原因。
 * @returns 保留已有移动成果的中断结算结果。
 */
function createInterruptedResult(
  input: SettleNormalMovementInput,
  finalTileId: TileId,
  explorationState: PlayerExplorationState,
  remainingMovementPoints: number,
  paidMovementCost: number,
  steps: readonly SettledNormalMovementStep[],
  interruption: NormalMovementInterruption,
): SettleNormalMovementResult {
  return createResult(
    interruption.reason,
    input,
    finalTileId,
    explorationState,
    remainingMovementPoints,
    paidMovementCost,
    steps,
    interruption,
  );
}

/**
 * 方法名：createResult
 * 作用：统一构造只读普通移动结算结果并计算实际消耗总量。
 * @param outcome 本次普通移动的最终结果。
 * @param input 本次普通移动的原始输入。
 * @param finalTileId 最终停留的地块标识。
 * @param explorationState 移动完成后的玩家探索状态。
 * @param remainingMovementPoints 移动完成后的剩余移动力。
 * @param paidMovementCost 成功进入地块所支付的基础成本。
 * @param steps 已成功执行的移动步骤。
 * @param interruption 未执行步骤的中断信息；正常完成时为 null。
 * @returns 字段完整且只读的普通移动结算结果。
 */
function createResult(
  outcome: NormalMovementSettlementOutcome,
  input: SettleNormalMovementInput,
  finalTileId: TileId,
  explorationState: PlayerExplorationState,
  remainingMovementPoints: number,
  paidMovementCost: number,
  steps: readonly SettledNormalMovementStep[],
  interruption: NormalMovementInterruption | null,
): SettleNormalMovementResult {
  return Object.freeze({
    outcome,
    initialTileId: input.currentTileId,
    finalTileId,
    initialMovementPoints: input.availableMovementPoints,
    remainingMovementPoints,
    paidMovementCost,
    consumedMovementPoints: input.availableMovementPoints - remainingMovementPoints,
    steps: Object.freeze([...steps]),
    explorationState,
    interruption,
  });
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验移动力为非负安全整数。
 * @param value 待校验的数值。
 * @param field 用于错误信息的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
