import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import {
  recordSuccessfulTileEntry,
  validatePlayerExplorationState,
  type PlayerExplorationState,
} from "../exploration/player-exploration-state.ts";
import { validateCubeCoordinate } from "../geometry/cube-coordinate.ts";
import { areCubeCoordinatesAdjacent } from "../geometry/hex-direction.ts";
import { MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE } from "../movement/movement-config.ts";
import type { HexMap } from "../model/hex-map.ts";
import type { HexTile } from "../model/hex-tile.ts";
import { FORCED_DISPLACEMENT_SETTLEMENT_OUTCOMES } from "./forced-displacement-config.ts";
import {
  validateForcedDisplacementDefinition,
  type ForcedDisplacementDefinition,
} from "./forced-displacement-definition.ts";
import type { ForcedDisplacementPlan } from "./forced-displacement-planner.ts";

/** 描述强制位移结算可能产生的标准结果。 */
export type ForcedDisplacementSettlementOutcome =
  (typeof FORCED_DISPLACEMENT_SETTLEMENT_OUTCOMES)[number];

/** 描述一次强制位移结算所需的地图、定义、计划和探索状态。 */
export interface SettleForcedDisplacementInput {
  readonly map: HexMap;
  readonly currentTileId: TileId;
  readonly explorationState: PlayerExplorationState;
  readonly definition: ForcedDisplacementDefinition;
  readonly plan: ForcedDisplacementPlan;
}

/** 描述一次已经成功执行的强制位移步骤。 */
export interface SettledForcedDisplacementStep {
  readonly sequence: number;
  readonly originTileId: TileId;
  readonly targetTileId: TileId;
  readonly targetCoordinate: CubeCoordinate;
  readonly isFirstExploration: boolean;
  readonly triggersArrivalEffects: boolean;
}

/** 描述强制位移最终位置、探索变化和中断位置。 */
export interface SettleForcedDisplacementResult {
  readonly outcome: ForcedDisplacementSettlementOutcome;
  readonly definitionId: string;
  readonly initialTileId: TileId;
  readonly finalTileId: TileId;
  readonly steps: readonly SettledForcedDisplacementStep[];
  readonly explorationState: PlayerExplorationState;
  readonly interruptedCoordinate: CubeCoordinate | null;
  readonly endsActiveMovement: boolean;
}

/**
 * 方法名：settleForcedDisplacement
 * 作用：按照强制位移定义逐个校验并执行规划坐标，同时安全处理边界、阻挡和高度规则。
 * @param input 地图、当前位置、探索状态、强制位移定义与规划结果。
 * @returns 强制位移后的最终位置、成功步骤、探索状态和中断原因。
 * @throws 定义、计划、当前位置或路径结构非法时抛出错误。
 */
export function settleForcedDisplacement(
  input: SettleForcedDisplacementInput,
): SettleForcedDisplacementResult {
  validateForcedDisplacementDefinition(input.definition);
  validatePlayerExplorationState(input.explorationState, input.map);

  const initialTile = input.map.getTileById(input.currentTileId);

  if (initialTile === undefined) {
    throw new Error(`Forced displacement current tile does not exist: ${input.currentTileId}`);
  }

  if (input.plan.definitionId !== input.definition.definitionId) {
    throw new Error("Forced displacement plan does not match definition");
  }

  validatePlanStructure(input.definition, initialTile, input.plan);

  let currentTile = initialTile;
  let explorationState = input.explorationState;
  const steps: SettledForcedDisplacementStep[] = [];

  for (const targetCoordinate of input.plan.targetCoordinates) {
    const targetTile = input.map.getTileAt(targetCoordinate);

    if (targetTile === undefined) {
      return handleInterruption(
        input,
        "boundary",
        currentTile.tileId,
        explorationState,
        steps,
        targetCoordinate,
      );
    }

    if (isObstructed(input.definition, currentTile, targetTile)) {
      if (input.definition.obstructionBehavior !== "IGNORE") {
        return handleInterruption(
          input,
          "obstruction",
          currentTile.tileId,
          explorationState,
          steps,
          targetCoordinate,
        );
      }
    }

    const entry = input.definition.recordsExploration
      ? recordSuccessfulTileEntry(explorationState, targetTile.tileId, input.map)
      : { explorationState, isFirstExploration: false };

    steps.push(
      Object.freeze({
        sequence: steps.length + 1,
        originTileId: currentTile.tileId,
        targetTileId: targetTile.tileId,
        targetCoordinate: targetTile.coordinate,
        isFirstExploration: entry.isFirstExploration,
        triggersArrivalEffects: input.definition.triggersArrivalEffects,
      }),
    );
    currentTile = targetTile;
    explorationState = entry.explorationState;
  }

  return createResult(input, "completed", currentTile.tileId, explorationState, steps, null);
}

/**
 * 方法名：validatePlanStructure
 * 作用：校验路径型位移逐格相邻，并限制传送型位移只包含一个最终目标。
 * @param definition 当前强制位移定义。
 * @param initialTile 强制位移开始时的地图地块。
 * @param plan 具体规划器生成的目标坐标序列。
 * @returns 无返回值。
 * @throws 计划为空、传送目标过多或路径步骤不相邻时抛出错误。
 */
function validatePlanStructure(
  definition: ForcedDisplacementDefinition,
  initialTile: HexTile,
  plan: ForcedDisplacementPlan,
): void {
  if (plan.targetCoordinates.length === 0) {
    throw new Error("Forced displacement plan must contain at least one target coordinate");
  }

  if (definition.mode === "TELEPORT" && plan.targetCoordinates.length !== 1) {
    throw new Error("Teleport forced displacement must contain exactly one target coordinate");
  }

  for (const targetCoordinate of plan.targetCoordinates) {
    validateCubeCoordinate(targetCoordinate);
  }

  if (definition.mode === "PATH") {
    let previousCoordinate = initialTile.coordinate;

    for (const targetCoordinate of plan.targetCoordinates) {
      if (!areCubeCoordinatesAdjacent(previousCoordinate, targetCoordinate)) {
        throw new Error("Path forced displacement targets must be adjacent in sequence");
      }

      previousCoordinate = targetCoordinate;
    }
  }
}

/**
 * 方法名：isObstructed
 * 作用：根据目标通行状态及强制位移高度规则判断目标是否构成阻挡。
 * @param definition 当前强制位移静态定义。
 * @param originTile 本步骤开始位置。
 * @param targetTile 本步骤准备进入的目标地块。
 * @returns 目标不可按照当前定义进入时返回 true。
 */
function isObstructed(
  definition: ForcedDisplacementDefinition,
  originTile: HexTile,
  targetTile: HexTile,
): boolean {
  if (targetTile.passability === "blocked") {
    return true;
  }

  return (
    definition.elevationRule === "NORMAL_LIMIT" &&
    Math.abs(targetTile.elevation - originTile.elevation) > MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE
  );
}

/**
 * 方法名：handleInterruption
 * 作用：根据停止或失败策略生成保留部分位移或整体回滚的中断结果。
 * @param input 本次强制位移原始输入。
 * @param reason 中断来自地图边界或目标阻挡。
 * @param currentTileId 中断前最后成功到达的地块。
 * @param explorationState 中断前已经产生的探索状态。
 * @param steps 中断前已经完成的位移步骤。
 * @param interruptedCoordinate 导致中断的目标坐标。
 * @returns 符合定义策略的强制位移中断结果。
 */
function handleInterruption(
  input: SettleForcedDisplacementInput,
  reason: "boundary" | "obstruction",
  currentTileId: TileId,
  explorationState: PlayerExplorationState,
  steps: readonly SettledForcedDisplacementStep[],
  interruptedCoordinate: CubeCoordinate,
): SettleForcedDisplacementResult {
  const behavior =
    reason === "boundary"
      ? input.definition.boundaryBehavior
      : input.definition.obstructionBehavior;
  const failed = behavior === "FAIL";
  const outcome = `${failed ? "failed" : "stopped"}_${
    reason === "boundary" ? "at_boundary" : "by_obstruction"
  }` as ForcedDisplacementSettlementOutcome;

  return createResult(
    input,
    outcome,
    failed ? input.currentTileId : currentTileId,
    failed ? input.explorationState : explorationState,
    failed ? [] : steps,
    interruptedCoordinate,
  );
}

/**
 * 方法名：createResult
 * 作用：创建格式统一且不可变的强制位移结算结果。
 * @param input 本次强制位移原始输入。
 * @param outcome 强制位移标准结算结果。
 * @param finalTileId 最终合法停留地块。
 * @param explorationState 结算后探索状态。
 * @param steps 最终保留的成功位移步骤。
 * @param interruptedCoordinate 导致中断的坐标，完整执行时为 null。
 * @returns 不可变的强制位移结算结果。
 */
function createResult(
  input: SettleForcedDisplacementInput,
  outcome: ForcedDisplacementSettlementOutcome,
  finalTileId: TileId,
  explorationState: PlayerExplorationState,
  steps: readonly SettledForcedDisplacementStep[],
  interruptedCoordinate: CubeCoordinate | null,
): SettleForcedDisplacementResult {
  return Object.freeze({
    outcome,
    definitionId: input.definition.definitionId,
    initialTileId: input.currentTileId,
    finalTileId,
    steps: Object.freeze([...steps]),
    explorationState,
    interruptedCoordinate,
    endsActiveMovement: input.definition.endsActiveMovement,
  });
}
