import { describe, expect, it } from "vitest";

import {
  addHandCardToSharedDiscardPile,
  createHandCardDeckState,
  drawHandCardFromDeck,
  validateHandCardDeckState,
} from "./hand-card-deck-state.ts";
import type { HandCardDefinition, HandCardDefinitionCatalog } from "./hand-card-definition.ts";
import { createHandCardInstance } from "./hand-card-instance.ts";

const CARD: HandCardDefinition = {
  definitionId: "hand-card.sprint",
  name: "Sprint",
  description: "Improves one movement action.",
  quality: "common",
  type: "action",
  usage: {
    timing: "active",
    responseTypes: [],
    conditionIds: ["player.can-move"],
    targetTypes: ["self"],
  },
  effectIds: ["effect.movement.bonus"],
  keywords: ["movement"],
  destinationAfterResolution: "discard",
};

const DEFINITIONS = {
  [CARD.definitionId]: CARD,
} as const satisfies HandCardDefinitionCatalog;

function createCard(index: number) {
  return createHandCardInstance({
    instanceId: `hand-card-instance-${index}`,
    definition: CARD,
  });
}

describe("shared hand card deck state", () => {
  it("allows multiple physical cards to use the same definition", () => {
    const firstCard = createCard(1);
    const secondCard = createCard(2);
    const deck = createHandCardDeckState("deck.shared", [firstCard, secondCard], DEFINITIONS);

    expect(deck.drawPile).toEqual([firstCard, secondCard]);
    expect(deck.discardPile).toEqual([]);
  });

  it("draws the first physical card from the shared deck", () => {
    const firstCard = createCard(1);
    const secondCard = createCard(2);
    const deck = createHandCardDeckState("deck.shared", [firstCard, secondCard], DEFINITIONS);
    const result = drawHandCardFromDeck(deck, DEFINITIONS);

    expect(result.card).toEqual(firstCard);
    expect(result.state.drawPile).toEqual([secondCard]);
    expect(deck.drawPile).toHaveLength(2);
  });

  it("stores discarded cards in the shared discard pile", () => {
    const card = createCard(1);
    const deck = createHandCardDeckState("deck.shared", [], DEFINITIONS);
    const nextState = addHandCardToSharedDiscardPile(deck, card, DEFINITIONS);

    expect(nextState.drawPile).toEqual([]);
    expect(nextState.discardPile).toEqual([card]);
  });

  it("returns no card when the draw pile is empty", () => {
    const deck = createHandCardDeckState("deck.empty", [], DEFINITIONS);
    const result = drawHandCardFromDeck(deck, DEFINITIONS);

    expect(result).toEqual({ state: deck, card: null });
  });

  it("rejects duplicate physical card ids across shared piles", () => {
    const card = createCard(1);
    const state = {
      deckId: "deck.invalid",
      drawPile: [card],
      discardPile: [card],
    };

    expect(() => validateHandCardDeckState(state, DEFINITIONS)).toThrow(
      "Duplicate hand card instance id in shared piles",
    );
  });
});
