import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { RandomManager } from "../random/core/random-manager.ts";
import { createMasterSeed } from "../random/core/random-seed.ts";
import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import {
  dealInitialHandCards,
  drawHandCardWithDiscardRecycle,
  initializeSharedHandCardDeck,
  recycleSharedHandCardDiscardPile,
} from "./hand-card-flow.ts";
import { createPlayerHandState } from "./player-hand-state.ts";

const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);
const CARD_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PLAYER_ONE_ID = "player-1" as PlayerId;
const PLAYER_TWO_ID = "player-2" as PlayerId;

/**
 * 方法名：createCard
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
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
  CARD_IDS.map((cardId) => [cardId, createCard(cardId)]),
) as HandCardCatalog;

describe("hand card flow", () => {
  it("initializes and reproducibly shuffles the shared deck with the deck random stream", () => {
    const firstManager = RandomManager.create(MASTER_SEED);
    const secondManager = RandomManager.create(MASTER_SEED);

    const firstDeck = initializeSharedHandCardDeck(
      "deck.shared",
      CARD_IDS,
      CATALOG,
      firstManager.getStream("deck", "deck.shared"),
    );
    const secondDeck = initializeSharedHandCardDeck(
      "deck.shared",
      CARD_IDS,
      CATALOG,
      secondManager.getStream("deck", "deck.shared"),
    );

    expect(firstDeck.drawPile).toEqual(secondDeck.drawPile);
    expect(firstDeck.drawPile).not.toEqual(CARD_IDS);
    expect([...firstDeck.drawPile].sort((left, right) => left - right)).toEqual(CARD_IDS);
    expect(firstDeck.discardPile).toEqual([]);
    expect(CARD_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("rejects random streams owned by another business module", () => {
    const manager = RandomManager.create(MASTER_SEED);

    expect(() =>
      initializeSharedHandCardDeck("deck.shared", CARD_IDS, CATALOG, manager.getStream("combat")),
    ).toThrow("requires a deck random stream");
  });

  it("recycles and shuffles the shared discard pile only after the draw pile is exhausted", () => {
    const manager = RandomManager.create(MASTER_SEED);
    const randomStream = manager.getStream("deck", "deck.shared");
    const exhaustedDeck = {
      deckId: "deck.shared",
      drawPile: [],
      discardPile: [1, 2, 3, 4],
    } as const;

    const recycled = recycleSharedHandCardDiscardPile(exhaustedDeck, CATALOG, randomStream);

    expect([...recycled.drawPile].sort((left, right) => left - right)).toEqual([1, 2, 3, 4]);
    expect(recycled.discardPile).toEqual([]);

    const activeDeck = {
      deckId: "deck.shared",
      drawPile: [5],
      discardPile: [1, 2, 3, 4],
    } as const;

    expect(recycleSharedHandCardDiscardPile(activeDeck, CATALOG, randomStream)).toBe(activeDeck);
  });

  it("draws from the recycled pile and safely returns no card when both piles are empty", () => {
    const manager = RandomManager.create(MASTER_SEED);
    const randomStream = manager.getStream("deck", "deck.shared");
    const recycledDraw = drawHandCardWithDiscardRecycle(
      {
        deckId: "deck.shared",
        drawPile: [],
        discardPile: [1, 2],
      },
      CATALOG,
      randomStream,
    );

    expect(recycledDraw.cardId).not.toBeNull();
    expect(recycledDraw.didRecycleDiscardPile).toBe(true);
    expect(recycledDraw.state.drawPile).toHaveLength(1);
    expect(recycledDraw.state.discardPile).toEqual([]);

    const emptyDeck = createHandCardDeckState("deck.empty", [], CATALOG);
    const emptyDraw = drawHandCardWithDiscardRecycle(emptyDeck, CATALOG, randomStream);

    expect(emptyDraw).toEqual({
      state: emptyDeck,
      cardId: null,
      didRecycleDiscardPile: false,
    });
  });

  it("deals two initial cards to each player in round-robin order", () => {
    const deck = createHandCardDeckState("deck.shared", CARD_IDS, CATALOG);
    const playerHands = [
      createPlayerHandState(PLAYER_ONE_ID),
      createPlayerHandState(PLAYER_TWO_ID),
    ];

    const result = dealInitialHandCards(deck, playerHands, CATALOG);

    expect(result.playerHandStates[0]?.handCardIds).toEqual([1, 3]);
    expect(result.playerHandStates[1]?.handCardIds).toEqual([2, 4]);
    expect(result.deckState.drawPile).toEqual([5, 6, 7, 8]);
    expect(result.deckState.discardPile).toEqual([]);
    expect(playerHands[0]?.handCardIds).toEqual([]);
    expect(deck.drawPile).toEqual(CARD_IDS);
  });

  it("rejects initial dealing before changing state when the shared deck is too small", () => {
    const deck = createHandCardDeckState("deck.shared", [1, 2, 3], CATALOG);
    const playerHands = [
      createPlayerHandState(PLAYER_ONE_ID),
      createPlayerHandState(PLAYER_TWO_ID),
    ];

    expect(() => dealInitialHandCards(deck, playerHands, CATALOG)).toThrow(
      "Not enough hand cards for initial dealing",
    );
    expect(deck.drawPile).toEqual([1, 2, 3]);
    expect(playerHands.every((state) => state.handCardIds.length === 0)).toBe(true);
  });
});
