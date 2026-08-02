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

export interface DiscardExcessHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly discardedCardIds: readonly HandCardId[];
  readonly sizeStatus: HandSizeStatus;
}

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

function validateUniqueCardIds(cardIds: readonly HandCardId[]): void {
  const uniqueCardIds = new Set<HandCardId>();

  for (const cardId of cardIds) {
    if (uniqueCardIds.has(cardId)) {
      throw new Error(`Duplicate excess hand card id: ${cardId}`);
    }

    uniqueCardIds.add(cardId);
  }
}
