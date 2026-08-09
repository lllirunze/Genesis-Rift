import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { createCharacter } from "../../character/create-character.ts";
import { getCoinBalance } from "../../economy/coin.ts";
import { createHandCardDeckState } from "../../hand/hand-card-deck-state.ts";
import type { HandCardCatalog } from "../../hand/hand-card-definition.ts";
import { createTestHandCardId } from "../../hand/hand-card-test-helper.ts";
import { createPlayerHandState } from "../../hand/player-hand-state.ts";
import { createPlayerInventory } from "../../inventory/player-inventory-state.ts";
import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import type { BattleSettlement } from "./battle-settlement.ts";
import { settleBattleRewards } from "./settle-battle-rewards.ts";

/** 战斗奖励测试使用的最小元宝与材料定义。 */
const ITEMS = {
  item_000001: {
    definitionId: "item_000001",
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000002: {
    definitionId: "item_000002",
    name: "Linen Cloth",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const satisfies ItemDefinitionCatalog;

describe("settleBattleRewards", () => {
  it("atomically grants experience, coin, and deterministic item rewards after a formal death", () => {
    const character = createTestCharacter();
    const inventory = createPlayerInventory("player_a" as PlayerId);

    const result = settleBattleRewards(
      createSettlement("DEAD"),
      character,
      inventory,
      { experience: 12, coin: 3, items: [{ definitionId: "item_000002", quantity: 2 }] },
      ITEMS,
      (definitionId, quantity) =>
        Array.from({ length: quantity }, (_, index) => `${definitionId}:reward:${index}`),
    );

    expect(result.character.levelProgression.currentExperience).toBe(12);
    expect(getCoinBalance(result.inventory)).toBe(3);
    expect(result.inventory.backpack.entries).toHaveLength(2);
    expect(character.levelProgression.currentExperience).toBe(0);
    expect(inventory.backpack.entries).toHaveLength(0);
  });

  it("rejects reward dispatch before the defender is formally dead", () => {
    expect(() =>
      settleBattleRewards(
        createSettlement("DOWNED"),
        createTestCharacter(),
        createPlayerInventory("player_a" as PlayerId),
        { experience: 1, coin: 0, items: [] },
        ITEMS,
        () => [],
      ),
    ).toThrow("formally dead");
  });

  it("moves configured hand card rewards from the shared deck into the attacker hand", () => {
    const cardId = createTestHandCardId(1);
    const cards: HandCardCatalog = {
      [cardId]: {
        cardId,
        name: "sprint",
        description: "Move farther.",
        quality: "common",
        type: "action",
        usage: { timing: "active", responseTypes: [], conditionIds: [], targetTypes: ["player"] },
        effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
        destinationAfterResolution: "discard",
      },
    };
    const result = settleBattleRewards(
      createSettlement("DEAD"),
      createTestCharacter(),
      createPlayerInventory("player_a" as PlayerId),
      { experience: 0, coin: 0, items: [], handCardCount: 1 },
      ITEMS,
      () => [],
      {
        deckState: createHandCardDeckState("deck.shared", [cardId], cards),
        playerHandState: createPlayerHandState("player_a" as PlayerId),
        handCardCatalog: cards,
        randomStream: RandomStream.create(
          "deck",
          "deck.shared",
          createRandomStreamSeed("0123456789abcdef"),
        ),
      },
    );

    expect(result.playerHandState?.handCardIds).toEqual([cardId]);
    expect(result.deckState?.drawPile).toEqual([]);
  });
});

/** 创建满足战斗奖励归属校验的最小战斗结算。 */
function createSettlement(status: "DOWNED" | "DEAD"): BattleSettlement {
  return {
    settlementId: "settlement_1",
    attack: { context: { attackerId: "player_a" } } as BattleSettlement["attack"],
    defenderSurvival: {
      participantId: "npc_a",
      status,
      downedTurnsRemaining: status === "DOWNED" ? 1 : 0,
    },
    survivalTransition: status === "DOWNED" ? "ENTERED_DOWNED" : "UNCHANGED",
  };
}

/** 创建用于接收战斗奖励的最小角色。 */
function createTestCharacter() {
  return createCharacter({
    playerId: "player_a" as PlayerId,
    identity: {
      id: "identity.test",
      initialPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
    },
    race: {
      id: "race.test",
      initialPrimaryAttributeOffset: {
        strength: 0,
        constitution: 0,
        spirit: 0,
        agility: 0,
        insight: 0,
      },
    },
  });
}
