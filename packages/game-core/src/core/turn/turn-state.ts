import type { PlayerId } from "@genesis-rift/shared";

import type { TurnPhase } from "./turn-phase.ts";

/** 描述一局游戏当前公开的全局回合位置。 */
export interface TurnState {
  readonly globalTurn: number;
  readonly round: number;
  readonly activePlayerId: PlayerId | null;
  readonly phase: TurnPhase;
}

/** 创建全局回合状态时需要提供的初始数据。 */
export interface CreateTurnStateInput {
  readonly playerOrder: readonly PlayerId[];
  readonly initialGlobalTurn?: number;
}

/** 描述推进回合时不应获得行动机会的临时不可用玩家。 */
export interface AdvanceTurnStateOptions {
  readonly unavailablePlayerIds?: readonly PlayerId[];
}

/**
 * 方法名：createTurnState
 * 作用：根据当前玩家顺序创建一局游戏的初始全局回合状态。
 * @param input 玩家顺序与可选的全局回合起点。
 * @returns 当前首位玩家处于回合开始阶段的回合状态。
 * @throws 玩家顺序包含重复或空白标识时抛出错误。
 */
export function createTurnState(input: CreateTurnStateInput): TurnState {
  validatePlayerOrder(input.playerOrder);
  const globalTurn = input.initialGlobalTurn ?? 0;

  if (!Number.isSafeInteger(globalTurn) || globalTurn < 0) {
    throw new RangeError("initialGlobalTurn must be a non-negative safe integer");
  }

  return Object.freeze({
    globalTurn,
    round: input.playerOrder.length === 0 ? 0 : 1,
    activePlayerId: input.playerOrder[0] ?? null,
    phase: input.playerOrder.length === 0 ? "roundEnd" : "turnStart",
  });
}

/**
 * 方法名：advanceTurnState
 * 作用：在一名玩家完整回合结束后推进到下一名仍在行动顺序中的玩家。
 * @param state 当前全局回合状态。
 * @param playerOrder 当前有效的玩家行动顺序。
 * @returns 已增加全局玩家回合计数的新回合状态。
 * @throws 当前不存在行动玩家或顺序与回合状态不一致时抛出错误。
 */
export function advanceTurnState(
  state: TurnState,
  playerOrder: readonly PlayerId[],
  options: AdvanceTurnStateOptions = {},
): TurnState {
  validatePlayerOrder(playerOrder);

  if (state.activePlayerId === null || playerOrder.length === 0) {
    throw new Error("Cannot advance a turn without an active player");
  }

  const activeIndex = playerOrder.indexOf(state.activePlayerId);

  if (activeIndex < 0) {
    throw new Error(`Active player is missing from turn order: ${state.activePlayerId}`);
  }

  const unavailablePlayerIds = new Set(options.unavailablePlayerIds ?? []);
  let nextIndex: number | null = null;

  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const candidateIndex = (activeIndex + offset) % playerOrder.length;
    const candidatePlayerId = playerOrder[candidateIndex]!;

    if (!unavailablePlayerIds.has(candidatePlayerId)) {
      nextIndex = candidateIndex;
      break;
    }
  }

  if (nextIndex === null) {
    throw new Error("Cannot advance a turn without an available player");
  }

  const startsNextRound = nextIndex === 0;

  return Object.freeze({
    globalTurn: state.globalTurn + 1,
    round: startsNextRound ? state.round + 1 : state.round,
    activePlayerId: playerOrder[nextIndex]!,
    phase: "turnStart",
  });
}

/**
 * 方法名：removePlayerFromTurnState
 * 作用：在玩家超时离席后修正行动顺序对应的当前回合位置。
 * @param state 当前全局回合状态。
 * @param previousPlayerOrder 移除前的完整行动顺序。
 * @param nextPlayerOrder 移除后的有效行动顺序。
 * @param removedPlayerId 已从游戏会话移除的玩家标识。
 * @returns 不再引用已离席玩家的新回合状态。
 * @throws 两份行动顺序不满足移除关系时抛出错误。
 */
export function removePlayerFromTurnState(
  state: TurnState,
  previousPlayerOrder: readonly PlayerId[],
  nextPlayerOrder: readonly PlayerId[],
  removedPlayerId: PlayerId,
): TurnState {
  validatePlayerOrder(previousPlayerOrder);
  validatePlayerOrder(nextPlayerOrder);

  if (!previousPlayerOrder.includes(removedPlayerId)) {
    throw new Error(`Removed player is missing from turn order: ${removedPlayerId}`);
  }

  if (nextPlayerOrder.includes(removedPlayerId)) {
    throw new Error(`Removed player still exists in turn order: ${removedPlayerId}`);
  }

  if (nextPlayerOrder.length === 0) {
    return Object.freeze({ ...state, round: 0, activePlayerId: null, phase: "roundEnd" });
  }

  if (state.activePlayerId !== removedPlayerId) {
    if (state.activePlayerId === null || !nextPlayerOrder.includes(state.activePlayerId)) {
      throw new Error("Active player is missing after player removal");
    }

    return Object.freeze({ ...state });
  }

  const removedIndex = previousPlayerOrder.indexOf(removedPlayerId);
  const nextPlayerId = nextPlayerOrder[removedIndex % nextPlayerOrder.length]!;
  const startsNextRound = nextPlayerId === nextPlayerOrder[0];

  return Object.freeze({
    ...state,
    round: startsNextRound ? state.round + 1 : state.round,
    activePlayerId: nextPlayerId,
    phase: "turnStart",
  });
}

/** 校验行动顺序可安全用于全局回合推进。 */
function validatePlayerOrder(playerOrder: readonly PlayerId[]): void {
  const playerIds = new Set<string>();

  for (const playerId of playerOrder) {
    if (typeof playerId !== "string" || playerId.trim().length === 0) {
      throw new TypeError("playerOrder must contain non-empty player identifiers");
    }

    if (playerIds.has(playerId)) {
      throw new Error(`Duplicate player in turn order: ${playerId}`);
    }

    playerIds.add(playerId);
  }
}
