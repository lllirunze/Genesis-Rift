import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

import { discardExcessHandCards } from "./discard-excess-hand-cards.ts";
import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";

const PLAYER_ID = "player-1" as PlayerId;

/**
 * 方法名：createCard
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function createCard(cardId: HandCardDefinition["cardId"]): HandCardDefinition {
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
  Array.from({ length: 8 }, (_, index) => {
    const card = createCard(createTestHandCardId(index + 1));
    return [card.cardId, card];
  }),
) as HandCardCatalog;

/**
 * 方法名：createHand
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardIds 方法所需的 cardIds 参数。
 * @returns 本次处理得到的结果。
 */
function createHand(cardIds: readonly HandCardDefinition["cardId"][]) {
  let state = createPlayerHandState(PLAYER_ID);

  for (const cardId of cardIds) {
    state = addHandCardToHand(state, cardId, CATALOG).state;
  }

  return state;
}

describe("discard excess hand cards", () => {
  it("moves the exact excess selection into the shared discard pile", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createHand([
      createTestHandCardId(1),
      createTestHandCardId(2),
      createTestHandCardId(3),
      createTestHandCardId(4),
      createTestHandCardId(5),
      createTestHandCardId(6),
      createTestHandCardId(7),
      createTestHandCardId(8),
    ]);

    const result = discardExcessHandCards(
      deck,
      hand,
      [createTestHandCardId(2), createTestHandCardId(7)],
      CATALOG,
    );

    expect(result.playerHandState.handCardIds).toEqual([
      createTestHandCardId(1),
      createTestHandCardId(3),
      createTestHandCardId(4),
      createTestHandCardId(5),
      createTestHandCardId(6),
      createTestHandCardId(8),
    ]);
    expect(result.deckState.discardPile).toEqual([
      createTestHandCardId(2),
      createTestHandCardId(7),
    ]);
    expect(result.discardedCardIds).toEqual([createTestHandCardId(2), createTestHandCardId(7)]);
    expect(result.sizeStatus).toMatchObject({
      cardCount: 6,
      requiredDiscardCount: 0,
      isOverLimit: false,
    });
    expect(hand.handCardIds).toHaveLength(8);
    expect(deck.discardPile).toEqual([]);
  });

  it("requires the complete excess amount to be selected", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createHand([
      createTestHandCardId(1),
      createTestHandCardId(2),
      createTestHandCardId(3),
      createTestHandCardId(4),
      createTestHandCardId(5),
      createTestHandCardId(6),
      createTestHandCardId(7),
      createTestHandCardId(8),
    ]);

    expect(() => discardExcessHandCards(deck, hand, [createTestHandCardId(1)], CATALOG)).toThrow(
      "requires exactly 2 card(s)",
    );
    expect(() =>
      discardExcessHandCards(
        deck,
        hand,
        [createTestHandCardId(1), createTestHandCardId(2), createTestHandCardId(3)],
        CATALOG,
      ),
    ).toThrow("requires exactly 2 card(s)");
  });

  it("rejects duplicate selections and cards outside the player's hand", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createHand([
      createTestHandCardId(1),
      createTestHandCardId(2),
      createTestHandCardId(3),
      createTestHandCardId(4),
      createTestHandCardId(5),
      createTestHandCardId(6),
      createTestHandCardId(7),
      createTestHandCardId(8),
    ]);

    expect(() =>
      discardExcessHandCards(
        deck,
        hand,
        [createTestHandCardId(1), createTestHandCardId(1)],
        CATALOG,
      ),
    ).toThrow("Duplicate excess hand card id");
    expect(() =>
      discardExcessHandCards(
        deck,
        hand,
        [createTestHandCardId(1), createTestHandCardId(99)],
        CATALOG,
      ),
    ).toThrow("Hand card is not in hand: card_000099");
    expect(deck.discardPile).toEqual([]);
    expect(hand.handCardIds).toHaveLength(8);
  });

  it("accepts an empty selection when the hand is within its limit", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const hand = createHand([createTestHandCardId(1), createTestHandCardId(2)]);

    const result = discardExcessHandCards(deck, hand, [], CATALOG);

    expect(result.deckState).toBe(deck);
    expect(result.playerHandState).toBe(hand);
    expect(result.discardedCardIds).toEqual([]);
  });
});
