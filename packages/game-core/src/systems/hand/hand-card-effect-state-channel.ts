import type { PlayerId } from "@genesis-rift/shared";

import type { HandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog } from "./hand-card-definition.ts";
import type { PlayerHandState } from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

export interface HandCardEffectStateSnapshot {
  readonly deckState: HandCardDeckState;
  readonly playerHandStates: readonly PlayerHandState[];
}

export class HandCardEffectStateChannel {
  private deckState: HandCardDeckState;
  private playerHandStates: readonly PlayerHandState[];

  private constructor(
    initialState: HandCardEffectStateSnapshot,
    private readonly catalog: HandCardCatalog,
  ) {
    this.deckState = initialState.deckState;
    this.playerHandStates = Object.freeze([...initialState.playerHandStates]);
  }

  static create(
    initialState: HandCardEffectStateSnapshot,
    catalog: HandCardCatalog,
  ): HandCardEffectStateChannel {
    validateSharedHandCardZones(initialState.deckState, initialState.playerHandStates, catalog);
    return new HandCardEffectStateChannel(initialState, catalog);
  }

  getDeckState(): HandCardDeckState {
    return this.deckState;
  }

  getPlayerHandState(playerId: PlayerId | string): PlayerHandState | null {
    return this.playerHandStates.find((state) => state.playerId === playerId) ?? null;
  }

  getPlayerHandStates(): readonly PlayerHandState[] {
    return this.playerHandStates;
  }

  updateDeckAndPlayerHand(deckState: HandCardDeckState, playerHandState: PlayerHandState): void {
    const playerIndex = this.playerHandStates.findIndex(
      (state) => state.playerId === playerHandState.playerId,
    );

    if (playerIndex === -1) {
      throw new Error(
        `Cannot update an unregistered player hand state: ${playerHandState.playerId}`,
      );
    }

    const nextPlayerHandStates = this.playerHandStates.map((state, index) =>
      index === playerIndex ? playerHandState : state,
    );
    validateSharedHandCardZones(deckState, nextPlayerHandStates, this.catalog);
    this.deckState = deckState;
    this.playerHandStates = Object.freeze(nextPlayerHandStates);
  }

  exportState(): HandCardEffectStateSnapshot {
    return Object.freeze({
      deckState: this.deckState,
      playerHandStates: Object.freeze([...this.playerHandStates]),
    });
  }
}
