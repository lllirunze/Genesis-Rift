import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import { HandCardEffectStateChannel } from "./hand-card-effect-state-channel.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";

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
      conditionIds: ["player.canMove"],
      targetTypes: ["player"],
    },
    effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
    destinationAfterResolution: "discard",
  };
}

const CATALOG = Object.fromEntries(
  [1, 2, 3, 4].map((cardId) => [cardId, createCard(cardId)]),
) as HandCardCatalog;

describe("hand card effect state channel", () => {
  it("tracks the latest shared deck and every registered player hand", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState("deck.shared", [3, 4], CATALOG),
        playerHandStates: [
          addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), 1, CATALOG).state,
          addHandCardToHand(createPlayerHandState(PLAYER_TWO_ID), 2, CATALOG).state,
        ],
      },
      CATALOG,
    );
    const nextDeck = createHandCardDeckState("deck.shared", [4], CATALOG);
    const nextPlayerOneHand = addHandCardToHand(
      channel.getPlayerHandState(PLAYER_ONE_ID)!,
      3,
      CATALOG,
    ).state;

    channel.updateDeckAndPlayerHand(nextDeck, nextPlayerOneHand);

    expect(channel.getDeckState().drawPile).toEqual([4]);
    expect(channel.getPlayerHandState(PLAYER_ONE_ID)?.handCardIds).toEqual([1, 3]);
    expect(channel.getPlayerHandState(PLAYER_TWO_ID)?.handCardIds).toEqual([2]);
    expect(channel.exportState().playerHandStates).toHaveLength(2);
  });

  it("rejects updates that duplicate a card across zones", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState("deck.shared", [2, 3, 4], CATALOG),
        playerHandStates: [
          addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), 1, CATALOG).state,
        ],
      },
      CATALOG,
    );
    const invalidHand = addHandCardToHand(
      channel.getPlayerHandState(PLAYER_ONE_ID)!,
      2,
      CATALOG,
    ).state;

    expect(() => channel.updateDeckAndPlayerHand(channel.getDeckState(), invalidHand)).toThrow(
      "Hand card 2 exists in multiple zones",
    );
    expect(channel.getPlayerHandState(PLAYER_ONE_ID)?.handCardIds).toEqual([1]);
  });

  it("rejects updates for players outside the channel", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState("deck.shared", [1, 2, 3, 4], CATALOG),
        playerHandStates: [createPlayerHandState(PLAYER_ONE_ID)],
      },
      CATALOG,
    );

    expect(() =>
      channel.updateDeckAndPlayerHand(channel.getDeckState(), createPlayerHandState(PLAYER_TWO_ID)),
    ).toThrow("Cannot update an unregistered player hand state");
  });
});
