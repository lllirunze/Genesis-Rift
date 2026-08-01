import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import {
  addHandCardToHand,
  createPlayerHandState,
  DEFAULT_INITIAL_HAND_SIZE,
  discardHandCard,
  getHandSizeStatus,
  resolveHandCardUse,
  setHandSizeLimit,
  validatePlayerHandState,
} from "./player-hand-state.ts";
import type { HandCardDefinition, HandCardDefinitionCatalog } from "./hand-card-definition.ts";
import { createHandCardInstance } from "./hand-card-instance.ts";

const PLAYER_ID = "player-1" as PlayerId;

const DISCARD_CARD: HandCardDefinition = {
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

const RETURN_CARD: HandCardDefinition = {
  ...DISCARD_CARD,
  definitionId: "hand-card.returning-map",
  name: "Returning Map",
  description: "Returns to hand after its effect resolves.",
  quality: "rare",
  destinationAfterResolution: "hand",
};

const DEFINITIONS = {
  [DISCARD_CARD.definitionId]: DISCARD_CARD,
  [RETURN_CARD.definitionId]: RETURN_CARD,
} as const satisfies HandCardDefinitionCatalog;

function createCard(index: number, definition: HandCardDefinition = DISCARD_CARD) {
  return createHandCardInstance({
    instanceId: `hand-card-instance-${index}`,
    definition,
  });
}

describe("player hand state", () => {
  it("creates an empty hand with the default six-card limit", () => {
    const state = createPlayerHandState(PLAYER_ID);

    expect(state).toEqual({
      playerId: PLAYER_ID,
      sizeLimit: 6,
      handCards: [],
    });
    expect(DEFAULT_INITIAL_HAND_SIZE).toBe(2);
    expect(getHandSizeStatus(state).isOverLimit).toBe(false);
  });

  it("finishes acquisition before requiring excess cards to be discarded", () => {
    let state = createPlayerHandState(PLAYER_ID);

    for (let index = 1; index <= 7; index += 1) {
      state = addHandCardToHand(state, createCard(index), DEFINITIONS).state;
    }

    expect(state.handCards).toHaveLength(7);
    expect(getHandSizeStatus(state)).toEqual({
      cardCount: 7,
      sizeLimit: 6,
      requiredDiscardCount: 1,
      isOverLimit: true,
    });

    const discarded = discardHandCard(state, "hand-card-instance-1", DEFINITIONS);

    expect(discarded.state.handCards).toHaveLength(6);
    expect(discarded.card).toEqual(createCard(1));
    expect(discarded.sizeStatus.isOverLimit).toBe(false);
  });

  it("removes a normally resolved card for the shared discard pile", () => {
    const initial = addHandCardToHand(
      createPlayerHandState(PLAYER_ID),
      createCard(1),
      DEFINITIONS,
    ).state;
    const result = resolveHandCardUse(initial, "hand-card-instance-1", DEFINITIONS);

    expect(result.destination).toBe("discard");
    expect(result.state.handCards).toEqual([]);
    expect(result.card).toEqual(createCard(1));
  });

  it("keeps a special returning card in hand after resolution", () => {
    const card = createCard(1, RETURN_CARD);
    const initial = addHandCardToHand(createPlayerHandState(PLAYER_ID), card, DEFINITIONS).state;
    const result = resolveHandCardUse(initial, card.instanceId, DEFINITIONS);

    expect(result.destination).toBe("hand");
    expect(result.state).toBe(initial);
    expect(result.state.handCards).toEqual([card]);
  });

  it("allows rules to change the limit and reports the new discard requirement", () => {
    let state = createPlayerHandState(PLAYER_ID);

    for (let index = 1; index <= 3; index += 1) {
      state = addHandCardToHand(state, createCard(index), DEFINITIONS).state;
    }

    const result = setHandSizeLimit(state, DEFINITIONS, 1);

    expect(result.state.sizeLimit).toBe(1);
    expect(result.sizeStatus.requiredDiscardCount).toBe(2);
  });

  it("rejects duplicate instances in the same player hand", () => {
    const card = createCard(1);
    const state = addHandCardToHand(createPlayerHandState(PLAYER_ID), card, DEFINITIONS).state;

    expect(() => addHandCardToHand(state, card, DEFINITIONS)).toThrow(
      "Duplicate hand card instance id",
    );
  });

  it("rejects duplicated cards in a player hand state", () => {
    const card = createCard(1);

    expect(() =>
      validatePlayerHandState(
        {
          playerId: PLAYER_ID,
          sizeLimit: 6,
          handCards: [card, card],
        },
        DEFINITIONS,
      ),
    ).toThrow("Duplicate hand card instance id");
  });
});
