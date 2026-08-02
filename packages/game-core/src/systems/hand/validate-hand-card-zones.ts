import type { PlayerId } from "@genesis-rift/shared";

import { type HandCardDeckState, validateHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardId } from "./hand-card-definition.ts";
import { type PlayerHandState, validatePlayerHandState } from "./player-hand-state.ts";

export function validateSharedHandCardZones(
  deckState: HandCardDeckState,
  playerHandStates: readonly PlayerHandState[],
  catalog: HandCardCatalog,
): void {
  validateHandCardDeckState(deckState, catalog);

  const playerIds = new Set<PlayerId>();
  const cardLocations = new Map<HandCardId, string>();

  for (const cardId of deckState.drawPile) {
    registerCardLocation(cardLocations, cardId, "shared draw pile");
  }

  for (const cardId of deckState.discardPile) {
    registerCardLocation(cardLocations, cardId, "shared discard pile");
  }

  for (const playerHandState of playerHandStates) {
    validatePlayerHandState(playerHandState, catalog);

    if (playerIds.has(playerHandState.playerId)) {
      throw new Error(`Duplicate player hand state: ${playerHandState.playerId}`);
    }

    playerIds.add(playerHandState.playerId);

    for (const cardId of playerHandState.handCardIds) {
      registerCardLocation(cardLocations, cardId, `player hand ${playerHandState.playerId}`);
    }
  }
}

function registerCardLocation(
  cardLocations: Map<HandCardId, string>,
  cardId: HandCardId,
  location: string,
): void {
  const existingLocation = cardLocations.get(cardId);

  if (existingLocation !== undefined) {
    throw new Error(
      `Hand card ${cardId} exists in multiple zones: ${existingLocation}, ${location}`,
    );
  }

  cardLocations.set(cardId, location);
}
