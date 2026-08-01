import type { HandCardDefinition, HandCardDefinitionCatalog } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";
import type { HandCardInstance } from "./hand-card-instance.ts";
import { validateHandCardInstance } from "./hand-card-instance.ts";

export interface HandCardDeckState {
  readonly deckId: string;
  readonly drawPile: readonly HandCardInstance[];
  readonly discardPile: readonly HandCardInstance[];
}

export interface DrawHandCardResult {
  readonly state: HandCardDeckState;
  readonly card: HandCardInstance | null;
}

export function createHandCardDeckState(
  deckId: string,
  cards: readonly HandCardInstance[],
  definitions: HandCardDefinitionCatalog,
): HandCardDeckState {
  assertNonEmptyString(deckId, "deckId");
  validateCardCollection(cards, definitions);

  return {
    deckId,
    drawPile: [...cards],
    discardPile: [],
  };
}

export function validateHandCardDeckState(
  state: HandCardDeckState,
  definitions: HandCardDefinitionCatalog,
): void {
  assertNonEmptyString(state.deckId, "deckId");
  validateCardCollection([...state.drawPile, ...state.discardPile], definitions);
}

export function drawHandCardFromDeck(
  state: HandCardDeckState,
  definitions: HandCardDefinitionCatalog,
): DrawHandCardResult {
  validateHandCardDeckState(state, definitions);
  const [card, ...drawPile] = state.drawPile;

  if (card === undefined) {
    return { state, card: null };
  }

  return {
    state: { ...state, drawPile },
    card,
  };
}

export function addHandCardToSharedDiscardPile(
  state: HandCardDeckState,
  card: HandCardInstance,
  definitions: HandCardDefinitionCatalog,
): HandCardDeckState {
  validateHandCardDeckState(state, definitions);
  const definition = getDefinition(definitions, card.definitionId);
  validateHandCardInstance(card, definition);

  if (containsInstance(state, card.instanceId)) {
    throw new Error(`Duplicate hand card instance id in shared piles: ${card.instanceId}`);
  }

  return {
    ...state,
    discardPile: [...state.discardPile, card],
  };
}

function validateCardCollection(
  cards: readonly HandCardInstance[],
  definitions: HandCardDefinitionCatalog,
): void {
  const instanceIds = new Set<string>();

  for (const card of cards) {
    if (instanceIds.has(card.instanceId)) {
      throw new Error(`Duplicate hand card instance id in shared piles: ${card.instanceId}`);
    }

    const definition = getDefinition(definitions, card.definitionId);
    validateHandCardInstance(card, definition);
    instanceIds.add(card.instanceId);
  }
}

function containsInstance(state: HandCardDeckState, instanceId: string): boolean {
  return [...state.drawPile, ...state.discardPile].some((card) => card.instanceId === instanceId);
}

function getDefinition(
  definitions: HandCardDefinitionCatalog,
  definitionId: string,
): HandCardDefinition {
  assertNonEmptyString(definitionId, "definitionId");
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Missing hand card definition in deck: ${definitionId}`);
  }

  validateHandCardDefinition(definition);
  return definition;
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
