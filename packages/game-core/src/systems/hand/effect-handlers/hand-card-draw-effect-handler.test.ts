import type { GameId, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createTestHandCardId } from "../hand-card-test-helper.ts";

import { RandomManager } from "../../random/core/random-manager.ts";
import { createMasterSeed } from "../../random/core/random-seed.ts";
import { createHandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import {
  addHandCardToSharedDiscardPile,
  createHandCardDeckState,
} from "../hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "../hand-card-definition.ts";
import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import { HandCardEffectStateChannel } from "../hand-card-effect-state-channel.ts";
import { addHandCardToHand, createPlayerHandState } from "../player-hand-state.ts";
import { createHandCardDrawEffectHandler } from "./hand-card-draw-effect-handler.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);

/**
 * 方法名：createCard
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function createCard(cardId: HandCardDefinition["cardId"]): HandCardDefinition {
  return {
    cardId,
    name: cardId === createTestHandCardId(1) ? "fieldSupply" : "sprint",
    description:
      cardId === createTestHandCardId(1)
        ? "Draws two hand cards from the shared deck."
        : "Improves one movement action.",
    quality: "common",
    type: "action",
    usage: {
      timing: "active",
      responseTypes: [],
      conditionIds: ["target.isSelf"],
      targetTypes: ["player"],
    },
    effects:
      cardId === createTestHandCardId(1)
        ? [{ effectId: "handCard.draw", parameters: { amount: 2 } }]
        : [{ effectId: "movement.modify", parameters: { amount: 1 } }],
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
const EFFECT = { effectId: "handCard.draw", parameters: { amount: 2 } } as const;

/**
 * 方法名：createChannel
 * 作用：创建并校验该方法所负责的业务对象。
 * @param deckState 方法所需的 deckState 参数。
 * @returns 本次处理得到的结果。
 */
function createChannel(
  deckState = createHandCardDeckState(
    "deck.shared",
    [createTestHandCardId(2), createTestHandCardId(3), createTestHandCardId(4)],
    CATALOG,
  ),
) {
  return HandCardEffectStateChannel.create(
    {
      deckState,
      playerHandStates: [
        addHandCardToHand(createPlayerHandState(PLAYER_ID), createTestHandCardId(1), CATALOG).state,
      ],
    },
    CATALOG,
  );
}

/**
 * 方法名：createContext
 * 作用：创建并校验该方法所负责的业务对象。
 * @param channel 方法所需的 channel 参数。
 * @param withRandomStream 方法所需的 withRandomStream 参数。
 * @returns 本次处理得到的结果。
 */
function createContext(channel: HandCardEffectStateChannel | null, withRandomStream = true) {
  return createHandCardEffectExecutionContext({
    executionId: "execution-draw-1",
    gameId: GAME_ID,
    cardId: createTestHandCardId(1),
    effectIndex: 0,
    sourcePlayerId: PLAYER_ID,
    timing: "active",
    targets: [{ type: "player", targetId: PLAYER_ID }],
    randomStream: withRandomStream
      ? RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared")
      : null,
    handCardStateChannel: channel,
  });
}

describe("hand card draw effect handler", () => {
  it("draws the configured amount and updates the shared state channel", () => {
    const channel = createChannel();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandCardDrawEffectHandler({ catalog: CATALOG }));

    const result = registry.execute(EFFECT, createContext(channel));

    expect(result).toMatchObject({
      effectId: "handCard.draw",
      outcome: "applied",
      output: {
        targets: [
          {
            targetPlayerId: PLAYER_ID,
            requestedAmount: 2,
            acquiredCardIds: [createTestHandCardId(2), createTestHandCardId(3)],
            isComplete: true,
          },
        ],
      },
    });
    expect(channel.getPlayerHandState(PLAYER_ID)?.handCardIds).toEqual([
      createTestHandCardId(1),
      createTestHandCardId(2),
      createTestHandCardId(3),
    ]);
    expect(channel.getDeckState().drawPile).toEqual([createTestHandCardId(4)]);
  });

  it("keeps the last draw-pile card ahead of the shuffled discard pile", () => {
    const deckWithLastCard = createHandCardDeckState(
      "deck.shared",
      [createTestHandCardId(2)],
      CATALOG,
    );
    const deck = addHandCardToSharedDiscardPile(
      addHandCardToSharedDiscardPile(deckWithLastCard, createTestHandCardId(3), CATALOG),
      createTestHandCardId(4),
      CATALOG,
    );
    const channel = createChannel(deck);
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandCardDrawEffectHandler({ catalog: CATALOG }));

    const result = registry.execute(EFFECT, createContext(channel));

    expect(result).toMatchObject({
      output: {
        targets: [{ acquiredCardIds: [createTestHandCardId(2), expect.any(String)] }],
      },
    });
    expect(channel.getDeckState().discardPile).toEqual([]);
    expect(channel.getDeckState().drawPile).toHaveLength(1);
  });

  it("requires both the state channel and deck random stream", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandCardDrawEffectHandler({ catalog: CATALOG }));

    expect(() => registry.execute(EFFECT, createContext(null))).toThrow(
      "requires a hand card state channel",
    );
    expect(() => registry.execute(EFFECT, createContext(createChannel(), false))).toThrow(
      "requires a deck random stream",
    );
  });

  it("skips when no cards remain in either shared pile", () => {
    const channel = createChannel(createHandCardDeckState("deck.shared", [], CATALOG));
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandCardDrawEffectHandler({ catalog: CATALOG }));

    expect(registry.execute(EFFECT, createContext(channel))).toEqual({
      effectId: "handCard.draw",
      outcome: "skipped",
      output: null,
    });
    expect(channel.getPlayerHandState(PLAYER_ID)?.handCardIds).toEqual([createTestHandCardId(1)]);
  });
});
