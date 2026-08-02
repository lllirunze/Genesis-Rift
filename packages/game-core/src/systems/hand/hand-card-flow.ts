import type { PlayerId } from "@genesis-rift/shared";

import type { RandomStream } from "../random/core/random-stream.ts";
import { DEFAULT_INITIAL_HAND_SIZE } from "./hand-card-config.ts";
import {
  createHandCardDeckState,
  drawHandCardFromDeck,
  type DrawHandCardResult,
  type HandCardDeckState,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import {
  addHandCardToHand,
  type PlayerHandState,
  validatePlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

/** 描述业务操作完成后返回的结果。 */
export interface DrawHandCardWithRecycleResult extends DrawHandCardResult {
  readonly didRecycleDiscardPile: boolean;
}

/** 描述业务操作完成后返回的结果。 */
export interface DealInitialHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandStates: readonly PlayerHandState[];
}

/**
 * 方法名：initializeSharedHandCardDeck
 * 作用：初始化模块运行所需的状态与依赖。
 * @param deckId 方法所需的 deckId 参数。
 * @param cardIds 方法所需的 cardIds 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function initializeSharedHandCardDeck(
  deckId: string,
  cardIds: readonly HandCardId[],
  catalog: HandCardCatalog,
  randomStream: RandomStream,
): HandCardDeckState {
  assertDeckRandomStream(randomStream);
  return createHandCardDeckState(deckId, randomStream.shuffle(cardIds), catalog);
}

/**
 * 方法名：recycleSharedHandCardDiscardPile
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function recycleSharedHandCardDiscardPile(
  state: HandCardDeckState,
  catalog: HandCardCatalog,
  randomStream: RandomStream,
): HandCardDeckState {
  validateHandCardDeckState(state, catalog);
  assertDeckRandomStream(randomStream);

  if (state.drawPile.length > 0 || state.discardPile.length === 0) {
    return state;
  }

  return {
    ...state,
    drawPile: randomStream.shuffle(state.discardPile),
    discardPile: [],
  };
}

/**
 * 方法名：prepareSharedHandCardDeckForDraw
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param requiredCardCount 方法所需的 requiredCardCount 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function prepareSharedHandCardDeckForDraw(
  state: HandCardDeckState,
  requiredCardCount: number,
  catalog: HandCardCatalog,
  randomStream: RandomStream,
): HandCardDeckState {
  validateHandCardDeckState(state, catalog);
  assertDeckRandomStream(randomStream);
  assertNonNegativeSafeInteger(requiredCardCount, "requiredCardCount");

  if (state.drawPile.length >= requiredCardCount || state.discardPile.length === 0) {
    return state;
  }

  return {
    ...state,
    drawPile: [...state.drawPile, ...randomStream.shuffle(state.discardPile)],
    discardPile: [],
  };
}

/**
 * 方法名：drawHandCardWithDiscardRecycle
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function drawHandCardWithDiscardRecycle(
  state: HandCardDeckState,
  catalog: HandCardCatalog,
  randomStream: RandomStream,
): DrawHandCardWithRecycleResult {
  const recycledState = prepareSharedHandCardDeckForDraw(state, 1, catalog, randomStream);
  const didRecycleDiscardPile = recycledState !== state;
  const drawResult = drawHandCardFromDeck(recycledState, catalog);

  return {
    ...drawResult,
    didRecycleDiscardPile,
  };
}

/**
 * 方法名：dealInitialHandCards
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param deckState 方法所需的 deckState 参数。
 * @param playerHandStates 方法所需的 playerHandStates 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @param cardsPerPlayer 方法所需的 cardsPerPlayer 参数。
 * @returns 本次处理得到的结果。
 */
export function dealInitialHandCards(
  deckState: HandCardDeckState,
  playerHandStates: readonly PlayerHandState[],
  catalog: HandCardCatalog,
  cardsPerPlayer: number = DEFAULT_INITIAL_HAND_SIZE,
): DealInitialHandCardsResult {
  validateHandCardDeckState(deckState, catalog);
  assertNonNegativeSafeInteger(cardsPerPlayer, "cardsPerPlayer");
  validateInitialPlayerHands(playerHandStates, catalog, cardsPerPlayer);
  validateSharedHandCardZones(deckState, playerHandStates, catalog);

  if (deckState.discardPile.length > 0) {
    throw new Error("Initial hand dealing requires an empty shared discard pile");
  }

  const requiredCardCount = playerHandStates.length * cardsPerPlayer;

  if (deckState.drawPile.length < requiredCardCount) {
    throw new Error(
      `Not enough hand cards for initial dealing: required ${requiredCardCount}, available ${deckState.drawPile.length}`,
    );
  }

  let nextDeckState = deckState;
  const nextPlayerHandStates = [...playerHandStates];

  // 每轮按座位顺序为每名玩家发一张牌，避免某个座位连续获得整段牌序。
  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (let playerIndex = 0; playerIndex < nextPlayerHandStates.length; playerIndex += 1) {
      const drawResult = drawHandCardFromDeck(nextDeckState, catalog);
      const cardId = drawResult.cardId;

      if (cardId === null) {
        throw new Error("Shared hand card deck was exhausted during initial dealing");
      }

      nextDeckState = drawResult.state;
      nextPlayerHandStates[playerIndex] = addHandCardToHand(
        nextPlayerHandStates[playerIndex]!,
        cardId,
        catalog,
      ).state;
    }
  }

  const result = {
    deckState: nextDeckState,
    playerHandStates: nextPlayerHandStates,
  };

  validateSharedHandCardZones(result.deckState, result.playerHandStates, catalog);
  return result;
}

/**
 * 方法名：validateInitialPlayerHands
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param playerHandStates 方法所需的 playerHandStates 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @param cardsPerPlayer 方法所需的 cardsPerPlayer 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateInitialPlayerHands(
  playerHandStates: readonly PlayerHandState[],
  catalog: HandCardCatalog,
  cardsPerPlayer: number,
): void {
  const playerIds = new Set<PlayerId>();

  for (const playerHandState of playerHandStates) {
    validatePlayerHandState(playerHandState, catalog);

    if (playerIds.has(playerHandState.playerId)) {
      throw new Error(`Duplicate player id for initial hand dealing: ${playerHandState.playerId}`);
    }

    if (playerHandState.handCardIds.length > 0) {
      throw new Error(`Initial player hand must be empty: ${playerHandState.playerId}`);
    }

    if (playerHandState.sizeLimit < cardsPerPlayer) {
      throw new Error(`Initial hand size exceeds player hand limit: ${playerHandState.playerId}`);
    }

    playerIds.add(playerHandState.playerId);
  }
}

/**
 * 方法名：assertDeckRandomStream
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertDeckRandomStream(randomStream: RandomStream): void {
  if (randomStream.streamType !== "deck") {
    throw new TypeError(`Hand card flow requires a deck random stream: ${randomStream.streamType}`);
  }
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
