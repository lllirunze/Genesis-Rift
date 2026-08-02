import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { RandomManager } from "../random/core/random-manager.ts";
import { createMasterSeed } from "../random/core/random-seed.ts";
import { acquireHandCardsFromSharedDeck } from "./acquire-hand-cards.ts";
import type { HandCardDrawSource } from "./hand-card-acquisition-definition.ts";
import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { createPlayerHandState } from "./player-hand-state.ts";

const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);
const PLAYER_ID = "player-1" as PlayerId;

function createCard(cardId: number): HandCardDefinition {
  return {
    cardId,
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
}

const CATALOG = Object.fromEntries(
  [1, 2, 3, 4].map((cardId) => [cardId, createCard(cardId)]),
) as HandCardCatalog;

describe("acquire hand cards", () => {
  it("draws only when an explicit business source is supplied", () => {
    const deck = createHandCardDeckState("deck.shared", [1, 2, 3], CATALOG);
    const playerHand = createPlayerHandState(PLAYER_ID);
    const randomStream = RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared");

    const result = acquireHandCardsFromSharedDeck(
      deck,
      playerHand,
      CATALOG,
      randomStream,
      { type: "chest", sourceId: "chest-forest-01" },
      2,
    );

    expect(result.acquiredCardIds).toEqual([1, 2]);
    expect(result.playerHandState.handCardIds).toEqual([1, 2]);
    expect(result.deckState.drawPile).toEqual([3]);
    expect(result.source).toEqual({ type: "chest", sourceId: "chest-forest-01" });
    expect(result.isComplete).toBe(true);
  });

  it("returns a partial result when both shared piles are exhausted", () => {
    const deck = createHandCardDeckState("deck.shared", [1], CATALOG);
    const result = acquireHandCardsFromSharedDeck(
      deck,
      createPlayerHandState(PLAYER_ID),
      CATALOG,
      RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared"),
      { type: "event", sourceId: "event-ancient-ruins" },
      2,
    );

    expect(result.acquiredCardIds).toEqual([1]);
    expect(result.isComplete).toBe(false);
    expect(result.requestedAmount).toBe(2);
  });

  it("shuffles the discard pile to the deck bottom before drawing multiple cards", () => {
    const deck = {
      deckId: "deck.shared",
      drawPile: [1, 2],
      discardPile: [3, 4],
    } as const;
    const result = acquireHandCardsFromSharedDeck(
      deck,
      createPlayerHandState(PLAYER_ID),
      CATALOG,
      RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared"),
      { type: "specialEffect", sourceId: "effect-draw-four" },
      3,
    );

    expect(result.acquiredCardIds.slice(0, 2)).toEqual([1, 2]);
    expect(result.acquiredCardIds).toHaveLength(3);
    expect(result.deckState.drawPile).toHaveLength(1);
    expect(result.deckState.discardPile).toEqual([]);
    expect(
      [...result.acquiredCardIds, ...result.deckState.drawPile].sort((left, right) => left - right),
    ).toEqual([1, 2, 3, 4]);
  });

  it("rejects implicit turn draws and invalid amounts", () => {
    const deck = createHandCardDeckState("deck.shared", [1], CATALOG);
    const playerHand = createPlayerHandState(PLAYER_ID);
    const randomStream = RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared");

    expect(() =>
      acquireHandCardsFromSharedDeck(
        deck,
        playerHand,
        CATALOG,
        randomStream,
        { type: "turnStart", sourceId: "turn-1" } as unknown as HandCardDrawSource,
        1,
      ),
    ).toThrow("Unsupported hand card draw source");

    expect(() =>
      acquireHandCardsFromSharedDeck(
        deck,
        playerHand,
        CATALOG,
        randomStream,
        { type: "boss", sourceId: "boss-1" },
        0,
      ),
    ).toThrow("amount must be a positive safe integer");
  });
});
