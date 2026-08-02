import type { PlayerId, TileId } from "@genesis-rift/shared";

import {
  isTileExplored,
  recordSuccessfulTileEntry,
  validatePlayerExplorationState,
  type PlayerExplorationState,
} from "../exploration/player-exploration-state.ts";
import type { HexMap } from "../model/hex-map.ts";
import { SPECIAL_CONNECTION_SETTLEMENT_OUTCOMES } from "./special-connection-config.ts";
import {
  validateSpecialConnectionDefinition,
  type SpecialConnectionDefinition,
} from "./special-connection-definition.ts";
import type { SpecialConnectionState } from "./special-connection-state.ts";

/** 描述特殊连接结算可能产生的标准结果。 */
export type SpecialConnectionSettlementOutcome =
  (typeof SPECIAL_CONNECTION_SETTLEMENT_OUTCOMES)[number];

/** 描述特殊连接条件判断所需的只读上下文。 */
export interface SpecialConnectionConditionContext {
  readonly playerId: PlayerId;
  readonly currentTileId: TileId;
  readonly targetTileId: TileId;
  readonly connection: SpecialConnectionDefinition;
}

/** 由具体职业、道具、任务或世界状态实现的连接条件判断接口。 */
export interface SpecialConnectionConditionEvaluator {
  isSatisfied(conditionId: string, context: SpecialConnectionConditionContext): boolean;
}

/** 描述一次特殊连接结算所需的完整输入。 */
export interface SettleSpecialConnectionInput {
  readonly map: HexMap;
  readonly playerId: PlayerId;
  readonly currentTileId: TileId;
  readonly explorationState: PlayerExplorationState;
  readonly availableMovementPoints: number;
  readonly definition: SpecialConnectionDefinition;
  readonly state: SpecialConnectionState;
  readonly conditionEvaluator?: SpecialConnectionConditionEvaluator;
}

/** 描述特殊连接结算后的最终位置、探索状态与后续效果提示。 */
export interface SettleSpecialConnectionResult {
  readonly outcome: SpecialConnectionSettlementOutcome;
  readonly connectionId: string;
  readonly initialTileId: TileId;
  readonly finalTileId: TileId;
  readonly targetTileId: TileId | null;
  readonly paidMovementCost: number;
  readonly remainingMovementPoints: number;
  readonly explorationState: PlayerExplorationState;
  readonly isFirstExploration: boolean;
  readonly triggersArrivalEffects: boolean;
}

/**
 * 方法名：settleSpecialConnection
 * 作用：按照连接方向、状态、发现信息、条件和移动成本结算一次特殊连接使用。
 * @param input 地图、玩家位置、探索状态、连接定义、运行时状态与条件判断器。
 * @returns 特殊连接执行后的最终位置、移动力和探索状态。
 * @throws 输入数据或连接配置非法时抛出错误。
 */
export function settleSpecialConnection(
  input: SettleSpecialConnectionInput,
): SettleSpecialConnectionResult {
  assertNonNegativeSafeInteger(input.availableMovementPoints, "availableMovementPoints");
  validatePlayerExplorationState(input.explorationState, input.map);
  validateSpecialConnectionDefinition(input.definition, input.map);

  if (input.explorationState.playerId !== input.playerId) {
    throw new Error("Special connection player does not match exploration state");
  }

  if (input.state.connectionId !== input.definition.connectionId) {
    throw new Error("Special connection state does not match definition");
  }

  if (input.map.getTileById(input.currentTileId) === undefined) {
    throw new Error(`Special connection current tile does not exist: ${input.currentTileId}`);
  }

  if (!isTileExplored(input.explorationState, input.currentTileId)) {
    throw new Error(
      `Special connection current tile has not been explored: ${input.currentTileId}`,
    );
  }

  const targetTileId = getConnectionTarget(input.definition, input.currentTileId);

  if (targetTileId === null) {
    return createUnchangedResult(input, "invalid_origin", null);
  }

  if (!input.state.enabled) {
    return createUnchangedResult(input, "disabled", targetTileId);
  }

  if (
    input.definition.visibility === "HIDDEN" &&
    !input.state.discoveredByPlayerIds.includes(input.playerId)
  ) {
    return createUnchangedResult(input, "undiscovered", targetTileId);
  }

  const context: SpecialConnectionConditionContext = {
    playerId: input.playerId,
    currentTileId: input.currentTileId,
    targetTileId,
    connection: input.definition,
  };

  if (
    input.definition.conditionIds.some(
      (conditionId) => !input.conditionEvaluator?.isSatisfied(conditionId, context),
    )
  ) {
    return createUnchangedResult(input, "condition_not_met", targetTileId);
  }

  const targetTile = input.map.getTileById(targetTileId)!;

  if (!input.definition.ignoresTargetPassability && targetTile.passability === "blocked") {
    return createUnchangedResult(input, "blocked", targetTileId);
  }

  if (input.availableMovementPoints < input.definition.movementCost) {
    return createUnchangedResult(input, "insufficient_movement", targetTileId);
  }

  const entry = input.definition.recordsExploration
    ? recordSuccessfulTileEntry(input.explorationState, targetTileId, input.map)
    : {
        explorationState: input.explorationState,
        isFirstExploration: false,
      };
  const isFirstExploration = entry.isFirstExploration;
  const remainingMovementPoints =
    isFirstExploration && input.definition.endsMovementOnFirstExploration
      ? 0
      : input.availableMovementPoints - input.definition.movementCost;

  return Object.freeze({
    outcome: isFirstExploration ? "first_exploration" : "completed",
    connectionId: input.definition.connectionId,
    initialTileId: input.currentTileId,
    finalTileId: targetTileId,
    targetTileId,
    paidMovementCost: input.definition.movementCost,
    remainingMovementPoints,
    explorationState: entry.explorationState,
    isFirstExploration,
    triggersArrivalEffects: input.definition.triggersArrivalEffects,
  });
}

/**
 * 方法名：getConnectionTarget
 * 作用：根据当前端点和连接方向确定本次连接使用的目标地块。
 * @param definition 当前特殊连接定义。
 * @param currentTileId 玩家当前所在的地块标识。
 * @returns 可以通向的目标地块，当前端点不能使用连接时返回 null。
 */
function getConnectionTarget(
  definition: SpecialConnectionDefinition,
  currentTileId: TileId,
): TileId | null {
  if (currentTileId === definition.sourceTileId) {
    return definition.targetTileId;
  }

  if (definition.direction === "TWO_WAY" && currentTileId === definition.targetTileId) {
    return definition.sourceTileId;
  }

  return null;
}

/**
 * 方法名：createUnchangedResult
 * 作用：创建不改变位置、移动力和探索记录的特殊连接失败结果。
 * @param input 本次特殊连接结算输入。
 * @param outcome 特殊连接未能执行的标准原因。
 * @param targetTileId 已解析的连接目标，无法从当前位置使用时为 null。
 * @returns 保留全部输入状态的不可变结算结果。
 */
function createUnchangedResult(
  input: SettleSpecialConnectionInput,
  outcome: Exclude<SpecialConnectionSettlementOutcome, "completed" | "first_exploration">,
  targetTileId: TileId | null,
): SettleSpecialConnectionResult {
  return Object.freeze({
    outcome,
    connectionId: input.definition.connectionId,
    initialTileId: input.currentTileId,
    finalTileId: input.currentTileId,
    targetTileId,
    paidMovementCost: 0,
    remainingMovementPoints: input.availableMovementPoints,
    explorationState: input.explorationState,
    isFirstExploration: false,
    triggersArrivalEffects: false,
  });
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验移动力为非负安全整数。
 * @param value 需要校验的移动力数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
