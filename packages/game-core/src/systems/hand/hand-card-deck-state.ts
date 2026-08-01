import type { HandCardCatalog, HandCardDefinition, HandCardId } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";

export interface HandCardDeckState {
  readonly deckId: string;
  readonly drawPile: readonly HandCardId[];
  readonly discardPile: readonly HandCardId[];
}

export interface DrawHandCardResult {
  readonly state: HandCardDeckState;
  readonly cardId: HandCardId | null;
}

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

export function validateHandCardDeckState(
  state: HandCardDeckState,
  catalog: HandCardCatalog,
): void {
  assertNonEmptyString(state.deckId, "deckId");
  validateCardIds([...state.drawPile, ...state.discardPile], catalog);
}

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

function containsCard(state: HandCardDeckState, cardId: HandCardId): boolean {
  return [...state.drawPile, ...state.discardPile].includes(cardId);
}

function getCard(catalog: HandCardCatalog, cardId: HandCardId): HandCardDefinition {
  const card = catalog[cardId];

  if (card === undefined) {
    throw new Error(`Missing hand card in catalog: ${cardId}`);
  }

  validateHandCardDefinition(card);
  return card;
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
