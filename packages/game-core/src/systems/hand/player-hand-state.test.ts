import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { DEFAULT_INITIAL_HAND_SIZE } from "./hand-card-config.ts";
import type { HandCardCatalog, HandCardDefinition } from "./hand-card-definition.ts";
import {
  addHandCardToHand,
  createPlayerHandState,
  discardHandCard,
  getHandSizeStatus,
  resolveHandCardUse,
  setHandSizeLimit,
  validatePlayerHandState,
} from "./player-hand-state.ts";

const PLAYER_ID = "player-1" as PlayerId;

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

const RETURN_CARD: HandCardDefinition = {
  ...createCard(8),
  name: "returningMap",
  description: "Returns to hand after its effect resolves.",
  quality: "rare",
  destinationAfterResolution: "hand",
};

const CATALOG = Object.fromEntries([
  ...Array.from({ length: 7 }, (_, index) => {
    const card = createCard(index + 1);
    return [card.cardId, card] as const;
  }),
  [RETURN_CARD.cardId, RETURN_CARD],
]) as HandCardCatalog;

describe("player hand state", () => {
  it("creates an empty hand with two initial cards configured and a six-card limit", () => {
    const state = createPlayerHandState(PLAYER_ID);

    expect(state).toEqual({
      playerId: PLAYER_ID,
      sizeLimit: 6,
      handCardIds: [],
    });
    expect(DEFAULT_INITIAL_HAND_SIZE).toBe(2);
    expect(getHandSizeStatus(state).isOverLimit).toBe(false);
  });

  it("finishes acquisition before requiring excess cards to be discarded", () => {
    let state = createPlayerHandState(PLAYER_ID);

    for (let cardId = 1; cardId <= 7; cardId += 1) {
      state = addHandCardToHand(state, cardId, CATALOG).state;
    }

    expect(state.handCardIds).toHaveLength(7);
    expect(getHandSizeStatus(state)).toEqual({
      cardCount: 7,
      sizeLimit: 6,
      requiredDiscardCount: 1,
      isOverLimit: true,
    });

    const discarded = discardHandCard(state, 1, CATALOG);

    expect(discarded.state.handCardIds).toHaveLength(6);
    expect(discarded.cardId).toBe(1);
    expect(discarded.sizeStatus.isOverLimit).toBe(false);
  });

  it("removes a normally resolved card for the shared discard pile", () => {
    const initial = addHandCardToHand(createPlayerHandState(PLAYER_ID), 1, CATALOG).state;
    const result = resolveHandCardUse(initial, 1, CATALOG);

    expect(result.destination).toBe("discard");
    expect(result.state.handCardIds).toEqual([]);
    expect(result.cardId).toBe(1);
  });

  it("keeps a special returning card id in hand after resolution", () => {
    const initial = addHandCardToHand(createPlayerHandState(PLAYER_ID), 8, CATALOG).state;
    const result = resolveHandCardUse(initial, 8, CATALOG);

    expect(result.destination).toBe("hand");
    expect(result.state).toBe(initial);
    expect(result.state.handCardIds).toEqual([8]);
  });

  it("allows rules to change the limit and reports the new discard requirement", () => {
    let state = createPlayerHandState(PLAYER_ID);

    for (let cardId = 1; cardId <= 3; cardId += 1) {
      state = addHandCardToHand(state, cardId, CATALOG).state;
    }

    const result = setHandSizeLimit(state, CATALOG, 1);

    expect(result.state.sizeLimit).toBe(1);
    expect(result.sizeStatus.requiredDiscardCount).toBe(2);
  });

  it("rejects duplicate card ids in the same player hand", () => {
    const state = addHandCardToHand(createPlayerHandState(PLAYER_ID), 1, CATALOG).state;

    expect(() => addHandCardToHand(state, 1, CATALOG)).toThrow("Duplicate hand card id");
  });

  it("rejects duplicated card ids in a player hand state", () => {
    expect(() =>
      validatePlayerHandState(
        {
          playerId: PLAYER_ID,
          sizeLimit: 6,
          handCardIds: [1, 1],
        },
        CATALOG,
      ),
    ).toThrow("Duplicate hand card id");
  });
});
