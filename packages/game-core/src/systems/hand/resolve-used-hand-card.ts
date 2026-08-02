import {
  addHandCardToSharedDiscardPile,
  type HandCardDeckState,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDestination, HandCardId } from "./hand-card-definition.ts";
import {
  resolveHandCardUse,
  type HandSizeStatus,
  type PlayerHandState,
} from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

export interface ResolveUsedHandCardDestinationResult {
  readonly deckState: HandCardDeckState;
  readonly playerHandState: PlayerHandState;
  readonly cardId: HandCardId;
  readonly destination: HandCardDestination;
  readonly sizeStatus: HandSizeStatus;
}

export function resolveUsedHandCardDestination(
  deckState: HandCardDeckState,
  playerHandState: PlayerHandState,
  cardId: HandCardId,
  catalog: HandCardCatalog,
): ResolveUsedHandCardDestinationResult {
  validateHandCardDeckState(deckState, catalog);
  validateSharedHandCardZones(deckState, [playerHandState], catalog);
  const handResult = resolveHandCardUse(playerHandState, cardId, catalog);

  if (handResult.destination === "hand") {
    const result: ResolveUsedHandCardDestinationResult = {
      deckState,
      playerHandState: handResult.state,
      cardId,
      destination: "hand",
      sizeStatus: handResult.sizeStatus,
    };

    validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
    return result;
  }

  const result: ResolveUsedHandCardDestinationResult = {
    deckState: addHandCardToSharedDiscardPile(deckState, cardId, catalog),
    playerHandState: handResult.state,
    cardId,
    destination: "discard",
    sizeStatus: handResult.sizeStatus,
  };

  validateSharedHandCardZones(result.deckState, [result.playerHandState], catalog);
  return result;
}
