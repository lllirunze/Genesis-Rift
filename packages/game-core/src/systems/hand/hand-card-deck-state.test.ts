import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

import {
  addHandCardToSharedDiscardPile,
  createHandCardDeckState,
  drawHandCardFromDeck,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";

const SPRINT_CARD: HandCardDefinition = {
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

const SECOND_SPRINT_CARD: HandCardDefinition = {
  ...SPRINT_CARD,
  cardId: createTestHandCardId(2),
};

const CATALOG = {
  [createTestHandCardId(1)]: SPRINT_CARD,
  [createTestHandCardId(2)]: SECOND_SPRINT_CARD,
} as const satisfies HandCardCatalog;

describe("shared hand card deck state", () => {
  it("allows identical cards when their global card ids differ", () => {
    const deck = createHandCardDeckState(
      "deck.shared",
      [createTestHandCardId(1), createTestHandCardId(2)],
      CATALOG,
    );

    expect(deck.drawPile).toEqual([createTestHandCardId(1), createTestHandCardId(2)]);
    expect(deck.discardPile).toEqual([]);
  });

  it("draws the first card id from the shared deck", () => {
    const deck = createHandCardDeckState(
      "deck.shared",
      [createTestHandCardId(1), createTestHandCardId(2)],
      CATALOG,
    );
    const result = drawHandCardFromDeck(deck, CATALOG);

    expect(result.cardId).toBe(createTestHandCardId(1));
    expect(result.state.drawPile).toEqual([createTestHandCardId(2)]);
    expect(deck.drawPile).toHaveLength(2);
  });

  it("stores discarded card ids in the shared discard pile", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const nextState = addHandCardToSharedDiscardPile(deck, createTestHandCardId(1), CATALOG);

    expect(nextState.drawPile).toEqual([]);
    expect(nextState.discardPile).toEqual([createTestHandCardId(1)]);
  });

  it("returns no card id when the draw pile is empty", () => {
    const deck = createHandCardDeckState("deck.empty", [], CATALOG);
    const result = drawHandCardFromDeck(deck, CATALOG);

    expect(result).toEqual({ state: deck, cardId: null });
  });

  it("rejects duplicate card ids across shared piles", () => {
    const state = {
      deckId: "deck.invalid",
      drawPile: [createTestHandCardId(1)],
      discardPile: [createTestHandCardId(1)],
    };

    expect(() => validateHandCardDeckState(state, CATALOG)).toThrow(
      "Duplicate hand card id in shared piles",
    );
  });
});
