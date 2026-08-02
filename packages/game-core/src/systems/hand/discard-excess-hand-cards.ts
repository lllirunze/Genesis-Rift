import {
  addHandCardToSharedDiscardPile,
  type HandCardDeckState,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import {
  discardHandCard,
  getHandSizeStatus,
  type HandSizeStatus,
  type PlayerHandState,
  validatePlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

/** 描述业务操作完成后返回的结果。 */
export interface DiscardExcessHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly discardedCardIds: readonly HandCardId[];
  readonly sizeStatus: HandSizeStatus;
}

/**
 * 方法名：discardExcessHandCards
 * 作用：移除目标数据，并返回更新后的状态。
 * @param deckState 方法所需的 deckState 参数。
 * @param playerHandState 方法所需的 playerHandState 参数。
 * @param cardIds 方法所需的 cardIds 参数。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 本次处理得到的结果。
 */
export function discardExcessHandCards(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  cardIds: readonly HandCardId[],
  catalog: HandCardCatalog,
): DiscardExcessHandCardsResult {
  validateHandCardDeckState(deckState, catalog);
  validatePlayerHandState(playerHandState, catalog);
  validateSharedHandCardZones(deckState, [playerHandState], catalog);
  validateUniqueCardIds(cardIds);

  const currentSizeStatus = getHandSizeStatus(playerHandState);

  if (cardIds.length !== currentSizeStatus.requiredDiscardCount) {
    throw new Error(
      `Excess hand discard requires exactly ${currentSizeStatus.requiredDiscardCount} card(s)`,
    );
  }

  let nextDeckState = deckState;
  let nextPlayerHandState = playerHandState;

  for (const cardId of cardIds) {
    const discardResult = discardHandCard(nextPlayerHandState, cardId, catalog);

    nextPlayerHandState = discardResult.state;
    nextDeckState = addHandCardToSharedDiscardPile(nextDeckState, cardId, catalog);
  }

  const result = {
    deckState: nextDeckState,
    playerHandState: nextPlayerHandState,
    discardedCardIds: [...cardIds],
    sizeStatus: getHandSizeStatus(nextPlayerHandState),
  };

  validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
  return result;
}

/**
 * 方法名：validateUniqueCardIds
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param cardIds 方法所需的 cardIds 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateUniqueCardIds(cardIds: readonly HandCardId[]): void {
  const uniqueCardIds = new Set<HandCardId>();

  for (const cardId of cardIds) {
    if (uniqueCardIds.has(cardId)) {
      throw new Error(`Duplicate excess hand card id: ${cardId}`);
    }

    uniqueCardIds.add(cardId);
  }
}
