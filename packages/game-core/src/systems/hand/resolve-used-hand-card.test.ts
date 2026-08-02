import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";
import { resolveUsedHandCardDestination } from "./resolve-used-hand-card.ts";

const PLAYER_ID = "player-1" as PlayerId;
const DISCARD_CARD: HandCardDefinition = {
  cardId: 1,
  name: "sprint",
  description: "Improves one movement action.",
  quality: "common",
  type: "action",
  usage: {
    timing: "active",
    responseTypes: [],
    conditionIds: ["player.canMove", "target.isSelf"],
    targetTypes: ["player"],
  },
  effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
  destinationAfterResolution: "discard",
};
const RETURN_CARD: HandCardDefinition = {
  ...DISCARD_CARD,
  cardId: 2,
  name: "returningMap",
  description: "Returns to its owner's hand after resolution.",
  quality: "rare",
  destinationAfterResolution: "hand",
};
const CATALOG = {
  1: DISCARD_CARD,
  2: RETURN_CARD,
} as const satisfies HandCardCatalog;

describe("resolve used hand card destination", () => {
  it("moves a normally consumed card into the shared discard pile", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = addHandCardToHand(createPlayerHandState(PLAYER_ID), 1, CATALOG).state;

    const result = resolveUsedHandCardDestination(deck, hand, 1, CATALOG);

    expect(result.destination).toBe("discard");
    expect(result.playerHandState.handCardIds).toEqual([]);
    expect(result.deckState.discardPile).toEqual([1]);
    expect(hand.handCardIds).toEqual([1]);
    expect(deck.discardPile).toEqual([]);
  });

  it("keeps a returning card in its owner's hand", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = addHandCardToHand(createPlayerHandState(PLAYER_ID), 2, CATALOG).state;

    const result = resolveUsedHandCardDestination(deck, hand, 2, CATALOG);

    expect(result.destination).toBe("hand");
    expect(result.playerHandState).toBe(hand);
    expect(result.deckState).toBe(deck);
    expect(result.playerHandState.handCardIds).toEqual([2]);
  });

  it("rejects a card that is not owned by the player", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createPlayerHandState(PLAYER_ID);

    expect(() => resolveUsedHandCardDestination(deck, hand, 1, CATALOG)).toThrow(
      "Hand card is not in hand: 1",
    );
  });
});
