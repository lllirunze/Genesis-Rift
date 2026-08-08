import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

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
      conditionIds: ["player.canMove"],
      targetTypes: ["player"],
    },
    effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
    destinationAfterResolution: "discard",
  };
}

const CATALOG = Object.fromEntries(
  [
    createTestHandCardId(1),
    createTestHandCardId(2),
    createTestHandCardId(3),
    createTestHandCardId(4),
  ].map((cardId) => [cardId, createCard(cardId)]),
) as HandCardCatalog;

describe("hand card effect state channel", () => {
  it("tracks the latest shared deck and every registered player hand", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState(
          "deck.shared",
          [createTestHandCardId(3), createTestHandCardId(4)],
          CATALOG,
        ),
        playerHandStates: [
          addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), createTestHandCardId(1), CATALOG)
            .state,
          addHandCardToHand(createPlayerHandState(PLAYER_TWO_ID), createTestHandCardId(2), CATALOG)
            .state,
        ],
      },
      CATALOG,
    );
    const nextDeck = createHandCardDeckState("deck.shared", [createTestHandCardId(4)], CATALOG);
    const nextPlayerOneHand = addHandCardToHand(
      channel.getPlayerHandState(PLAYER_ONE_ID)!,
      createTestHandCardId(3),
      CATALOG,
    ).state;

    channel.updateDeckAndPlayerHand(nextDeck, nextPlayerOneHand);

    expect(channel.getDeckState().drawPile).toEqual([createTestHandCardId(4)]);
    expect(channel.getPlayerHandState(PLAYER_ONE_ID)?.handCardIds).toEqual([
      createTestHandCardId(1),
      createTestHandCardId(3),
    ]);
    expect(channel.getPlayerHandState(PLAYER_TWO_ID)?.handCardIds).toEqual([
      createTestHandCardId(2),
    ]);
    expect(channel.exportState().playerHandStates).toHaveLength(2);
  });

  it("rejects updates that duplicate a card across zones", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState(
          "deck.shared",
          [createTestHandCardId(2), createTestHandCardId(3), createTestHandCardId(4)],
          CATALOG,
        ),
        playerHandStates: [
          addHandCardToHand(createPlayerHandState(PLAYER_ONE_ID), createTestHandCardId(1), CATALOG)
            .state,
        ],
      },
      CATALOG,
    );
    const invalidHand = addHandCardToHand(
      channel.getPlayerHandState(PLAYER_ONE_ID)!,
      createTestHandCardId(2),
      CATALOG,
    ).state;

    expect(() => channel.updateDeckAndPlayerHand(channel.getDeckState(), invalidHand)).toThrow(
      "Hand card card_000002 exists in multiple zones",
    );
    expect(channel.getPlayerHandState(PLAYER_ONE_ID)?.handCardIds).toEqual([
      createTestHandCardId(1),
    ]);
  });

  it("rejects updates for players outside the channel", () => {
    const channel = HandCardEffectStateChannel.create(
      {
        deckState: createHandCardDeckState(
          "deck.shared",
          [
            createTestHandCardId(1),
            createTestHandCardId(2),
            createTestHandCardId(3),
            createTestHandCardId(4),
          ],
          CATALOG,
        ),
        playerHandStates: [createPlayerHandState(PLAYER_ONE_ID)],
      },
      CATALOG,
    );

    expect(() =>
      channel.updateDeckAndPlayerHand(channel.getDeckState(), createPlayerHandState(PLAYER_TWO_ID)),
    ).toThrow("Cannot update an unregistered player hand state");
  });
});
