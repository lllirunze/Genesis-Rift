import type { HandCardCatalog, HandCardDefinition, HandCardId } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface HandCardDeckState {
  readonly deckId: string;
  readonly drawPile: readonly HandCardId[];
  readonly discardPile: readonly HandCardId[];
}

/** 描述业务操作完成后返回的结果。 */
export interface DrawHandCardResult {
  readonly state: HandCardDeckState;
  readonly cardId: HandCardId | null;
}

/**
 * 方法名：createHandCardDeckState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param deckId 方法所需的 deckId 参数。
 * @param cardIds 方法所需的 cardIds 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function createHandCardDeckState(
  deckId: string,
  cardIds: readonly HandCardId[],
  catalog: HandCardCatalog,
): HandCardDeckState {
  assertNonEmptyString(deckId, "deckId");
  validateCardIds(cardIds, catalog);

  return {
    deckId,
    drawPile: [...cardIds],
    discardPile: [],
  };
}

/**
 * 方法名：validateHandCardDeckState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateHandCardDeckState(
  state: HandCardDeckState,
  catalog: HandCardCatalog,
): void {
  assertNonEmptyString(state.deckId, "deckId");
  validateCardIds([...state.drawPile, ...state.discardPile], catalog);
}

/**
 * 方法名：drawHandCardFromDeck
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param state 当前业务状态。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function drawHandCardFromDeck(
  state: HandCardDeckState,
  catalog: HandCardCatalog,
): DrawHandCardResult {
  validateHandCardDeckState(state, catalog);
  const [cardId, ...drawPile] = state.drawPile;

  if (cardId === undefined) {
    return { state, cardId: null };
  }

  return {
    state: { ...state, drawPile },
    cardId,
  };
}

/**
 * 方法名：addHandCardToSharedDiscardPile
 * 作用：在保持既有约束的前提下添加目标数据。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function addHandCardToSharedDiscardPile(
  state: HandCardDeckState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): HandCardDeckState {
  validateHandCardDeckState(state, catalog);
  getCard(catalog, cardId);

  if (containsCard(state, cardId)) {
    throw new Error(`Duplicate hand card id in shared piles: ${cardId}`);
  }

  return {
    ...state,
    discardPile: [...state.discardPile, cardId],
  };
}

/**
 * 方法名：validateCardIds
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param cardIds 方法所需的 cardIds 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateCardIds(cardIds: readonly HandCardId[], catalog: HandCardCatalog): void {
  const uniqueCardIds = new Set<HandCardId>();

  for (const cardId of cardIds) {
    if (uniqueCardIds.has(cardId)) {
      throw new Error(`Duplicate hand card id in shared piles: ${cardId}`);
    }

    getCard(catalog, cardId);
    uniqueCardIds.add(cardId);
  }
}

/**
 * 方法名：containsCard
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function containsCard(state: HandCardDeckState, cardId: HandCardId): boolean {
  return [...state.drawPile, ...state.discardPile].includes(cardId);
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
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
