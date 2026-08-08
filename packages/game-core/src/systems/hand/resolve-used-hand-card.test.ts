import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";
import { resolveUsedHandCardDestination } from "./resolve-used-hand-card.ts";

const PLAYER_ID = "player-1" as PlayerId;
const DISCARD_CARD: HandCardDefinition = {
  cardId: createTestHandCardId(1),
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
  cardId: createTestHandCardId(2),
  name: "returningMap",
  description: "Returns to its owner's hand after resolution.",
  quality: "rare",
  destinationAfterResolution: "hand",
};
const CATALOG = {
  [createTestHandCardId(1)]: DISCARD_CARD,
  [createTestHandCardId(2)]: RETURN_CARD,
} as const satisfies HandCardCatalog;

describe("resolve used hand card destination", () => {
  it("moves a normally consumed card into the shared discard pile", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = addHandCardToHand(
      createPlayerHandState(PLAYER_ID),
      createTestHandCardId(1),
      CATALOG,
    ).state;

    const result = resolveUsedHandCardDestination(deck, hand, createTestHandCardId(1), CATALOG);

    expect(result.destination).toBe("discard");
    expect(result.playerHandState.handCardIds).toEqual([]);
    expect(result.deckState.discardPile).toEqual([createTestHandCardId(1)]);
    expect(hand.handCardIds).toEqual([createTestHandCardId(1)]);
    expect(deck.discardPile).toEqual([]);
  });

  it("keeps a returning card in its owner's hand", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = addHandCardToHand(
      createPlayerHandState(PLAYER_ID),
      createTestHandCardId(2),
      CATALOG,
    ).state;

    const result = resolveUsedHandCardDestination(deck, hand, createTestHandCardId(2), CATALOG);

    expect(result.destination).toBe("hand");
    expect(result.playerHandState).toBe(hand);
    expect(result.deckState).toBe(deck);
    expect(result.playerHandState.handCardIds).toEqual([createTestHandCardId(2)]);
  });

  it("rejects a card that is not owned by the player", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createPlayerHandState(PLAYER_ID);

    expect(() =>
      resolveUsedHandCardDestination(deck, hand, createTestHandCardId(1), CATALOG),
    ).toThrow("Hand card is not in hand: card_000001");
  });
});
