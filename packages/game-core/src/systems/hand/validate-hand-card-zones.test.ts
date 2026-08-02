import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { addHandCardToSharedDiscardPile, createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

const PLAYER_ONE_ID = "player-1" as PlayerId;
const PLAYER_TWO_ID = "player-2" as PlayerId;

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

describe("shared hand card zone validation", () => {
  it("accepts globally unique cards across shared and player zones", () => {
    const deckWithDrawPile = createHandCardDeckState("deck.shared", [1], CATALOG);
    const deck = addHandCardToSharedDiscardPile(deckWithDrawPile, 2, CATALOG);
    const playerOneHand = addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), 3, CATALOG).state;
    const playerTwoHand = addHandCardToHand(createPlayerHandState(PLAYER_TWO_ID), 4, CATALOG).state;

    expect(() =>
      validateSharedHandCardZones(deck, [playerOneHand, playerTwoHand], CATALOG),
    ).not.toThrow();
  });

  it("rejects a card shared by the deck and a player hand", () => {
    const deck = createHandCardDeckState("deck.shared", [1], CATALOG);
    const hand = addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), 1, CATALOG).state;

    expect(() => validateSharedHandCardZones(deck, [hand], CATALOG)).toThrow(
      "Hand card 1 exists in multiple zones: shared draw pile, player hand player-1",
    );
  });

  it("rejects a card shared by multiple player hands", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const playerOneHand = addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), 1, CATALOG).state;
    const playerTwoHand = addHandCardToHand(createPlayerHandState(PLAYER_TWO_ID), 1, CATALOG).state;

    expect(() =>
      validateSharedHandCardZones(deck, [playerOneHand, playerTwoHand], CATALOG),
    ).toThrow("Hand card 1 exists in multiple zones: player hand player-1, player hand player-2");
  });

  it("rejects duplicate player hand states", () => {
    const deck = createHandCardDeckState("deck.shared", [], CATALOG);
    const firstState = createPlayerHandState(PLAYER_ONE_ID);
    const duplicateState = addHandCardToHand(
      createPlayerHandState(PLAYER_ONE_ID),
      1,
      CATALOG,
    ).state;

    expect(() => validateSharedHandCardZones(deck, [firstState, duplicateState], CATALOG)).toThrow(
      "Duplicate player hand state: player-1",
    );
  });
});
