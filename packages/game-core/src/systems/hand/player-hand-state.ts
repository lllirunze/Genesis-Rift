import type { PlayerId } from "@genesis-rift/shared";

import { DEFAULT_HAND_SIZE_LIMIT } from "./hand-card-config.ts";
import type { HandCardCatalog, HandCardDefinition, HandCardId } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface PlayerHandState {
  readonly playerId: PlayerId;
  readonly sizeLimit: number;
  readonly handCardIds: readonly HandCardId[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandSizeStatus {
  readonly cardCount: number;
  readonly sizeLimit: number;
  readonly requiredDiscardCount: number;
  readonly isOverLimit: boolean;
}

/** 描述业务操作完成后返回的结果。 */
export interface AddHandCardToHandResult {
  readonly state: PlayerHandState;
  readonly sizeStatus: HandSizeStatus;
}

/** 描述业务操作完成后返回的结果。 */
export interface RemoveHandCardFromHandResult {
  readonly state: PlayerHandState;
  readonly cardId: HandCardId;
  readonly sizeStatus: HandSizeStatus;
}

/** 描述业务操作完成后返回的结果。 */
export interface ResolveHandCardResult {
  readonly state: PlayerHandState;
  readonly cardId: HandCardId;
  readonly destination: "discard" | "hand";
  readonly sizeStatus: HandSizeStatus;
}

/**
 * 方法名：createPlayerHandState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @param sizeLimit 方法所需的 sizeLimit 参数。
 * @returns 本次处理得到的结果。
 */
export function createPlayerHandState(
  playerId: PlayerId,
  sizeLimit: number = DEFAULT_HAND_SIZE_LIMIT,
): PlayerHandState {
  assertNonNegativeSafeInteger(sizeLimit, "sizeLimit");

  return {
    playerId,
    sizeLimit,
    handCardIds: [],
  };
}

/**
 * 方法名：validatePlayerHandState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validatePlayerHandState(state: PlayerHandState, catalog: HandCardCatalog): void {
  assertNonNegativeSafeInteger(state.sizeLimit, "sizeLimit");
  const uniqueCardIds = new Set<HandCardId>();

  for (const cardId of state.handCardIds) {
    if (uniqueCardIds.has(cardId)) {
      throw new Error(`Duplicate hand card id: ${cardId}`);
    }

    getCard(catalog, cardId);
    uniqueCardIds.add(cardId);
  }
}

/**
 * 方法名：getHandSizeStatus
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param state 当前业务状态。
 * @returns 本次处理得到的结果。
 */
export function getHandSizeStatus(state: PlayerHandState): HandSizeStatus {
  const requiredDiscardCount = Math.max(0, state.handCardIds.length - state.sizeLimit);

  return {
    cardCount: state.handCardIds.length,
    sizeLimit: state.sizeLimit,
    requiredDiscardCount,
    isOverLimit: requiredDiscardCount > 0,
  };
}

/**
 * 方法名：setHandSizeLimit
 * 作用：更新目标数据，并返回满足约束的新状态。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param sizeLimit 方法所需的 sizeLimit 参数。
 * @returns 本次处理得到的结果。
 */
export function setHandSizeLimit(
  state: PlayerHandState,
  catalog: HandCardCatalog,
  sizeLimit: number,
): AddHandCardToHandResult {
  validatePlayerHandState(state, catalog);
  assertNonNegativeSafeInteger(sizeLimit, "sizeLimit");
  const nextState = { ...state, sizeLimit };

  return {
    state: nextState,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

/**
 * 方法名：addHandCardToHand
 * 作用：在保持既有约束的前提下添加目标数据。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function addHandCardToHand(
  state: PlayerHandState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): AddHandCardToHandResult {
  validatePlayerHandState(state, catalog);
  getCard(catalog, cardId);

  if (state.handCardIds.includes(cardId)) {
    throw new Error(`Duplicate hand card id: ${cardId}`);
  }

  const nextState = { ...state, handCardIds: [...state.handCardIds, cardId] };

  return {
    state: nextState,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

/**
 * 方法名：discardHandCard
 * 作用：移除目标数据，并返回更新后的状态。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function discardHandCard(
  state: PlayerHandState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): RemoveHandCardFromHandResult {
  validatePlayerHandState(state, catalog);
  getCardIdFromHand(state, cardId);
  const nextState = {
    ...state,
    handCardIds: state.handCardIds.filter((candidate) => candidate !== cardId),
  };

  return {
    state: nextState,
    cardId,
    sizeStatus: getHandSizeStatus(nextState),
  };
}

/**
 * 方法名：resolveHandCardUse
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function resolveHandCardUse(
  state: PlayerHandState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): ResolveHandCardResult {
  validatePlayerHandState(state, catalog);
  getCardIdFromHand(state, cardId);
  const card = getCard(catalog, cardId);

  if (card.destinationAfterResolution === "hand") {
    return {
      state,
      cardId,
      destination: "hand",
      sizeStatus: getHandSizeStatus(state),
    };
  }

  const result = discardHandCard(state, cardId, catalog);

  return {
    state: result.state,
    cardId,
    destination: "discard",
    sizeStatus: result.sizeStatus,
  };
}

/**
 * 方法名：getHandCardIdFromHand
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
export function getHandCardIdFromHand(
  state: PlayerHandState,
  cardId: HandCardId,
): HandCardId | null {
  return state.handCardIds.includes(cardId) ? cardId : null;
}

/**
 * 方法名：getCardIdFromHand
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function getCardIdFromHand(state: PlayerHandState, cardId: HandCardId): HandCardId {
  const handCardId = getHandCardIdFromHand(state, cardId);

  if (handCardId === null) {
    throw new Error(`Hand card is not in hand: ${cardId}`);
  }

  return handCardId;
}

/**
 * 方法名：getCard
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function getCard(catalog: HandCardCatalog, cardId: HandCardId): HandCardDefinition {
  const card = catalog[cardId];

  if (card === undefined) {
    throw new Error(`Missing hand card in catalog: ${cardId}`);
  }

  validateHandCardDefinition(card);
  return card;
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
