import type { PlayerId } from "@genesis-rift/shared";

/** 描述玩家交易在确认前可经历的生命周期状态。 */
export const PLAYER_TRADE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
  "SETTLED",
] as const;

/** 描述玩家交易的当前生命周期状态。 */
export type PlayerTradeStatus = (typeof PLAYER_TRADE_STATUSES)[number];

/** 描述一名玩家向另一方提供的正式背包物品与元宝报价。 */
export interface PlayerTradeOffer {
  readonly itemInstanceIds: readonly string[];
  readonly coin: number;
}

/** 描述双方确认前保持不变的一次双边交易状态。 */
export interface PlayerTradeState {
  readonly tradeId: string;
  readonly initiatorId: PlayerId;
  readonly recipientId: PlayerId;
  readonly initiatorOffer: PlayerTradeOffer;
  readonly recipientOffer: PlayerTradeOffer;
  readonly initiatorConfirmed: boolean;
  readonly recipientConfirmed: boolean;
  readonly status: PlayerTradeStatus;
  readonly expiresAtTurn: number;
}

/**
 * 方法名：createPlayerTradeState
 * 作用：创建等待双方确认的交易状态，不在此阶段锁定或转移实际物品。
 * @param tradeId 本次交易的唯一运行时标识。
 * @param initiatorId 发起交易的玩家标识。
 * @param recipientId 接收报价的玩家标识。
 * @param initiatorOffer 发起方提供的物品与元宝。
 * @param recipientOffer 接收方提供的物品与元宝。
 * @param expiresAtTurn 交易允许确认的最后完整回合编号。
 * @returns 不可变的待确认交易状态。
 * @throws 标识重复、报价非法或过期回合非法时抛出错误。
 */
export function createPlayerTradeState(
  tradeId: string,
  initiatorId: PlayerId,
  recipientId: PlayerId,
  initiatorOffer: PlayerTradeOffer,
  recipientOffer: PlayerTradeOffer,
  expiresAtTurn: number,
): PlayerTradeState {
  assertNonEmptyString(tradeId, "tradeId");
  assertNonEmptyString(initiatorId, "initiatorId");
  assertNonEmptyString(recipientId, "recipientId");

  if (initiatorId === recipientId) {
    throw new Error("A player cannot trade with themselves");
  }

  validatePlayerTradeOffer(initiatorOffer);
  validatePlayerTradeOffer(recipientOffer);
  assertPositiveSafeInteger(expiresAtTurn, "expiresAtTurn");
  return Object.freeze({
    tradeId,
    initiatorId,
    recipientId,
    initiatorOffer: freezeOffer(initiatorOffer),
    recipientOffer: freezeOffer(recipientOffer),
    initiatorConfirmed: false,
    recipientConfirmed: false,
    status: "PENDING",
    expiresAtTurn,
  });
}

/**
 * 方法名：confirmPlayerTrade
 * 作用：记录一方确认；双方均确认后将交易状态转换为可结算状态。
 * @param state 当前待确认交易状态。
 * @param playerId 本次确认交易的玩家标识。
 * @param currentTurn 当前完整回合编号。
 * @returns 更新后的交易状态。
 * @throws 非参与者确认、交易已结束或超过确认期限时抛出错误。
 */
export function confirmPlayerTrade(
  state: PlayerTradeState,
  playerId: PlayerId,
  currentTurn: number,
): PlayerTradeState {
  validatePlayerTradeState(state);
  assertNonEmptyString(playerId, "playerId");
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  if (state.status !== "PENDING") {
    throw new Error("Only pending player trades can be confirmed");
  }

  if (currentTurn > state.expiresAtTurn) {
    throw new Error("Player trade has expired");
  }

  if (playerId !== state.initiatorId && playerId !== state.recipientId) {
    throw new Error("Only trade participants can confirm a trade");
  }

  const initiatorConfirmed = state.initiatorConfirmed || playerId === state.initiatorId;
  const recipientConfirmed = state.recipientConfirmed || playerId === state.recipientId;
  return Object.freeze({
    ...state,
    initiatorConfirmed,
    recipientConfirmed,
    status: initiatorConfirmed && recipientConfirmed ? "CONFIRMED" : "PENDING",
  });
}

/**
 * 方法名：cancelPlayerTrade
 * 作用：由任一交易参与者主动取消尚未完成的交易，不改变任何背包或元宝状态。
 * @param state 当前交易状态。
 * @param playerId 请求取消的玩家标识。
 * @returns 已取消的交易状态。
 * @throws 非参与者取消或交易已结束时抛出错误。
 */
export function cancelPlayerTrade(state: PlayerTradeState, playerId: PlayerId): PlayerTradeState {
  validatePlayerTradeState(state);
  assertNonEmptyString(playerId, "playerId");

  if (state.status !== "PENDING") {
    throw new Error("Only pending player trades can be cancelled");
  }

  if (playerId !== state.initiatorId && playerId !== state.recipientId) {
    throw new Error("Only trade participants can cancel a trade");
  }

  return Object.freeze({ ...state, status: "CANCELLED" });
}

/**
 * 方法名：expirePlayerTrade
 * 作用：在确认期限结束后关闭仍未完成的交易，不改变任何背包或元宝状态。
 * @param state 当前交易状态。
 * @param currentTurn 当前完整回合编号。
 * @returns 未到期时返回原状态，到期后返回已过期状态。
 * @throws 当前回合非法时抛出错误。
 */
export function expirePlayerTrade(state: PlayerTradeState, currentTurn: number): PlayerTradeState {
  validatePlayerTradeState(state);
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  if (state.status !== "PENDING" || currentTurn <= state.expiresAtTurn) {
    return state;
  }

  return Object.freeze({ ...state, status: "EXPIRED" });
}

/** 校验交易报价中的正式物品实例标识与元宝数量。 */
function validatePlayerTradeOffer(offer: PlayerTradeOffer): void {
  assertNonNegativeSafeInteger(offer.coin, "offer.coin");
  const itemIds = new Set<string>();

  for (const itemInstanceId of offer.itemInstanceIds) {
    assertNonEmptyString(itemInstanceId, "offer.itemInstanceIds");

    if (itemIds.has(itemInstanceId)) {
      throw new Error(`Duplicate offered item instance: ${itemInstanceId}`);
    }

    itemIds.add(itemInstanceId);
  }
}

/** 校验交易状态可作为后续确认和原子结算的输入。 */
function validatePlayerTradeState(state: PlayerTradeState): void {
  createPlayerTradeState(
    state.tradeId,
    state.initiatorId,
    state.recipientId,
    state.initiatorOffer,
    state.recipientOffer,
    state.expiresAtTurn,
  );

  if (!PLAYER_TRADE_STATUSES.includes(state.status)) {
    throw new RangeError(`Unsupported player trade status: ${state.status}`);
  }

  if (state.status === "CONFIRMED" && (!state.initiatorConfirmed || !state.recipientConfirmed)) {
    throw new Error("A confirmed player trade requires both participants to confirm");
  }
}

/** 冻结报价，避免调用方在确认期间修改物品或元宝内容。 */
function freezeOffer(offer: PlayerTradeOffer): PlayerTradeOffer {
  return Object.freeze({
    itemInstanceIds: Object.freeze([...offer.itemInstanceIds]),
    coin: offer.coin,
  });
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
