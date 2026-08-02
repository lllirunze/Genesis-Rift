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

export interface DrawHandCardWithRecycleResult extends DrawHandCardResult {
  readonly didRecycleDiscardPile: boolean;
}

export interface DealInitialHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandStates: readonly PlayerHandState[];
}

export function initializeSharedHandCardDeck(
  deckId: string,
  cardIds: readonly HandCardId[],
  catalog: HandCardCatalog,
  randomStream: RandomStream,
): HandCardDeckState {
  assertDeckRandomStream(randomStream);
  return createHandCardDeckState(deckId, randomStream.shuffle(cardIds), catalog);
}

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

  // Deal one card to each player per round so seating order does not receive consecutive blocks.
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

function assertDeckRandomStream(randomStream: RandomStream): void {
  if (randomStream.streamType !== "deck") {
    throw new TypeError(`Hand card flow requires a deck random stream: ${randomStream.streamType}`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
