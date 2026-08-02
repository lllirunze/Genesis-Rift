import type { RandomStream } from "../random/core/random-stream.ts";
import type { HandCardDrawSource } from "./hand-card-acquisition-definition.ts";
import { HAND_CARD_DRAW_SOURCE_TYPES } from "./hand-card-config.ts";
import { drawHandCardFromDeck, type HandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import { prepareSharedHandCardDeckForDraw } from "./hand-card-flow.ts";
import {
  addHandCardToHand,
  getHandSizeStatus,
  type HandSizeStatus,
  type PlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

export interface AcquireHandCardsResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly source: HandCardDrawSource;
  readonly requestedAmount: number;
  readonly acquiredCardIds: readonly HandCardId[];
  readonly isComplete: boolean;
  readonly sizeStatus: HandSizeStatus;
}

export function acquireHandCardsFromSharedDeck(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  catalog: HandCardCatalog,
  randomStream: RandomStream,
  source: HandCardDrawSource,
  amount: number,
): AcquireHandCardsResult {
  validateDrawSource(source);
  assertPositiveSafeInteger(amount, "amount");
  validateSharedHandCardZones(deckState, [playerHandState], catalog);

  let nextDeckState = prepareSharedHandCardDeckForDraw(deckState, amount, catalog, randomStream);
  let nextPlayerHandState = playerHandState;
  const acquiredCardIds: HandCardId[] = [];

  for (let index = 0; index < amount; index += 1) {
    const drawResult = drawHandCardFromDeck(nextDeckState, catalog);

    if (drawResult.cardId === null) {
      break;
    }

    nextDeckState = drawResult.state;
    nextPlayerHandState = addHandCardToHand(nextPlayerHandState, drawResult.cardId, catalog).state;
    acquiredCardIds.push(drawResult.cardId);
  }

  const result = {
    deckState: nextDeckState,
    playerHandState: nextPlayerHandState,
    source,
    requestedAmount: amount,
    acquiredCardIds,
    isComplete: acquiredCardIds.length === amount,
    sizeStatus: getHandSizeStatus(nextPlayerHandState),
  };

  validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
  return result;
}

function validateDrawSource(source: HandCardDrawSource): void {
  if (!HAND_CARD_DRAW_SOURCE_TYPES.includes(source.type)) {
    throw new RangeError(`Unsupported hand card draw source: ${source.type}`);
  }

  if (source.sourceId.trim().length === 0) {
    throw new TypeError("Hand card draw source id must not be empty");
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
