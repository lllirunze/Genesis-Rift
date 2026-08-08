import type { GameId, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import { createTestHandCardId } from "./hand-card-test-helper.ts";

import {
  executeHandCardEffects,
  HandCardEffectSequenceExecutionError,
} from "./execute-hand-card-effects.ts";
import { createHandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import type { HandCardEffectHandler } from "./hand-card-effect-handler.ts";
import { HandCardEffectHandlerRegistry } from "./hand-card-effect-handler-registry.ts";
import { createHandCardDrawEffectHandler } from "./effect-handlers/hand-card-draw-effect-handler.ts";
import { addHandCardToHand, createPlayerHandState } from "./player-hand-state.ts";
import { RandomManager } from "../random/core/random-manager.ts";
import { createMasterSeed } from "../random/core/random-seed.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);
const MULTI_EFFECT_CARD: HandCardDefinition = {
  cardId: createTestHandCardId(1),
  name: "fieldRecovery",
  description: "Restores health and removes one harmful status.",
  quality: "rare",
  type: "survival",
  usage: {
    timing: "active",
    responseTypes: [],
    conditionIds: ["target.isSelf"],
    targetTypes: ["player"],
  },
  effects: [
    { effectId: "health.restore", parameters: { amount: 10 } },
    { effectId: "status.remove", parameters: { statusDefinitionId: "debuff_000102" } },
  ],
  destinationAfterResolution: "discard",
};
const RETURNING_CARD: HandCardDefinition = {
  ...MULTI_EFFECT_CARD,
  cardId: createTestHandCardId(2),
  name: "returningRecovery",
  description: "Returns to hand after attempting its recovery effect.",
  effects: [{ effectId: "health.restore", parameters: { amount: 5 } }],
  destinationAfterResolution: "hand",
};
const MISSING_HANDLER_CARD: HandCardDefinition = {
  ...MULTI_EFFECT_CARD,
  cardId: createTestHandCardId(3),
  name: "unfinishedRecovery",
  description: "Requires one effect handler that is not registered yet.",
  effects: [
    { effectId: "health.restore", parameters: { amount: 5 } },
    { effectId: "weather.change", parameters: { weatherId: "weather_000002" } },
  ],
};
const DRAW_CARD: HandCardDefinition = {
  ...MULTI_EFFECT_CARD,
  cardId: createTestHandCardId(4),
  name: "fieldSupply",
  description: "Draws two cards before entering the shared discard pile.",
  effects: [{ effectId: "handCard.draw", parameters: { amount: 2 } }],
};
const DRAWN_CARD_ONE: HandCardDefinition = {
  ...RETURNING_CARD,
  cardId: createTestHandCardId(5),
  name: "drawnRecoveryOne",
  description: "Represents the first card obtained by a draw effect.",
};
const DRAWN_CARD_TWO: HandCardDefinition = {
  ...RETURNING_CARD,
  cardId: createTestHandCardId(6),
  name: "drawnRecoveryTwo",
  description: "Represents the second card obtained by a draw effect.",
};
const CATALOG = {
  [createTestHandCardId(1)]: MULTI_EFFECT_CARD,
  [createTestHandCardId(2)]: RETURNING_CARD,
  [createTestHandCardId(3)]: MISSING_HANDLER_CARD,
  [createTestHandCardId(4)]: DRAW_CARD,
  [createTestHandCardId(5)]: DRAWN_CARD_ONE,
  [createTestHandCardId(6)]: DRAWN_CARD_TWO,
} as const satisfies HandCardCatalog;

/**
 * 方法名：createContextInput
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function createContextInput(cardId: number) {
  return {
    executionId: `execution-card-${cardId}`,
    gameId: GAME_ID,
    cardId: createTestHandCardId(cardId),
    sourcePlayerId: PLAYER_ID,
    timing: "active" as const,
    targets: [{ type: "player" as const, targetId: PLAYER_ID }],
  };
}

/**
 * 方法名：createOwnedCardState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
function createOwnedCardState(cardId: number) {
  const deckState = createHandCardDeckState("deck.shared", [], CATALOG);
  const playerHandState = addHandCardToHand(
    createPlayerHandState(PLAYER_ID),
    createTestHandCardId(cardId),
    CATALOG,
  ).state;

  return { deckState, playerHandState };
}

describe("execute hand card effects", () => {
  it("preflights and executes every effect in configured order before discarding the card", () => {
    const executionOrder: string[] = [];
    const effectIndices: number[] = [];
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createHandler("health.restore", (context) => {
        executionOrder.push("health.restore");
        effectIndices.push(context.effectIndex);
        return "applied";
      }),
    );
    registry.register(
      createHandler("status.remove", (context) => {
        executionOrder.push("status.remove");
        effectIndices.push(context.effectIndex);
        return "skipped";
      }),
    );
    const { deckState, playerHandState } = createOwnedCardState(1);

    const result = executeHandCardEffects(
      deckState,
      playerHandState,
      CATALOG,
      registry,
      createContextInput(1),
    );

    expect(executionOrder).toEqual(["health.restore", "status.remove"]);
    expect(effectIndices).toEqual([0, 1]);
    expect(result.effectResults.map((effectResult) => effectResult.outcome)).toEqual([
      "applied",
      "skipped",
    ]);
    expect(result.destination).toBe("discard");
    expect(result.deckState.discardPile).toEqual([createTestHandCardId(1)]);
    expect(result.playerHandState.handCardIds).toEqual([]);
    expect(Object.isFrozen(result.effectResults)).toBe(true);
  });

  it("keeps a configured returning card in hand after all effects resolve", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandler("health.restore", () => "skipped"));
    const { deckState, playerHandState } = createOwnedCardState(2);

    const result = executeHandCardEffects(
      deckState,
      playerHandState,
      CATALOG,
      registry,
      createContextInput(2),
    );

    expect(result.destination).toBe("hand");
    expect(result.playerHandState.handCardIds).toEqual([createTestHandCardId(2)]);
    expect(result.deckState.discardPile).toEqual([]);
  });

  it("preserves newly drawn cards when resolving the used card destination", () => {
    const deckState = createHandCardDeckState(
      "deck.shared",
      [createTestHandCardId(5), createTestHandCardId(6)],
      CATALOG,
    );
    const playerHandState = addHandCardToHand(
      createPlayerHandState(PLAYER_ID),
      createTestHandCardId(4),
      CATALOG,
    ).state;
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandCardDrawEffectHandler({ catalog: CATALOG }));

    const result = executeHandCardEffects(deckState, playerHandState, CATALOG, registry, {
      ...createContextInput(4),
      randomStream: RandomManager.create(MASTER_SEED).getStream("deck", "deck.shared"),
    });

    expect(result.effectResults).toMatchObject([
      {
        effectId: "handCard.draw",
        outcome: "applied",
        output: {
          targets: [{ acquiredCardIds: [createTestHandCardId(5), createTestHandCardId(6)] }],
        },
      },
    ]);
    expect(result.playerHandState.handCardIds).toEqual([
      createTestHandCardId(5),
      createTestHandCardId(6),
    ]);
    expect(result.deckState.drawPile).toEqual([]);
    expect(result.deckState.discardPile).toEqual([createTestHandCardId(4)]);
  });

  it("checks every handler before running the first effect", () => {
    const execute = vi.fn(() => ({
      effectId: "health.restore" as const,
      outcome: "applied" as const,
      output: null,
    }));
    const registry = new HandCardEffectHandlerRegistry();
    registry.register({ effectId: "health.restore", execute });
    const { deckState, playerHandState } = createOwnedCardState(3);

    expect(() =>
      executeHandCardEffects(deckState, playerHandState, CATALOG, registry, createContextInput(3)),
    ).toThrow("Missing hand card effect handler: weather.change");
    expect(execute).not.toHaveBeenCalled();
    expect(playerHandState.handCardIds).toEqual([createTestHandCardId(3)]);
    expect(deckState.discardPile).toEqual([]);
  });

  it("reports the failed effect index and preserves the card when runtime execution fails", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandler("health.restore", () => "applied"));
    registry.register({
      effectId: "status.remove",
      /**
       * 方法名：execute
       * 作用：执行该方法负责的业务规则并返回结算结果。
       * @returns 本次处理得到的结果。
       */
      execute() {
        throw new Error("Status service unavailable");
      },
    });
    const { deckState, playerHandState } = createOwnedCardState(1);

    let receivedError: unknown;

    try {
      executeHandCardEffects(deckState, playerHandState, CATALOG, registry, createContextInput(1));
    } catch (error) {
      receivedError = error;
    }

    expect(receivedError).toBeInstanceOf(HandCardEffectSequenceExecutionError);
    expect(receivedError).toMatchObject({
      cardId: createTestHandCardId(1),
      failedEffectIndex: 1,
      failedEffectId: "status.remove",
      completedEffectResults: [{ effectId: "health.restore", outcome: "applied" }],
    });
    expect((receivedError as Error).cause).toEqual(new Error("Status service unavailable"));
    expect(playerHandState.handCardIds).toEqual([createTestHandCardId(1)]);
    expect(deckState.discardPile).toEqual([]);
  });

  it("rejects execution by a player who does not own the hand", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHandler("health.restore", () => "applied"));
    registry.register(createHandler("status.remove", () => "applied"));
    const { deckState, playerHandState } = createOwnedCardState(1);

    expect(() =>
      executeHandCardEffects(deckState, playerHandState, CATALOG, registry, {
        ...createContextInput(1),
        sourcePlayerId: "player-2" as PlayerId,
      }),
    ).toThrow("Hand card source player does not own the hand");
  });
});

/**
 * 方法名：createHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param effectId 方法所需的 effectId 参数。
 * @param executeEffect 方法所需的 executeEffect 参数。
 * @returns 本次处理得到的结果。
 */
function createHandler<EffectId extends "health.restore" | "status.remove">(
  effectId: EffectId,
  executeEffect: (
    context: Parameters<HandCardEffectHandler<EffectId>["execute"]>[1],
  ) => "applied" | "skipped",
): HandCardEffectHandler<EffectId> {
  return {
    effectId,
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param _effect 方法所需的 _effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(_effect, context) {
      return {
        effectId,
        outcome: executeEffect(context),
        output: null,
      };
    },
  };
}
