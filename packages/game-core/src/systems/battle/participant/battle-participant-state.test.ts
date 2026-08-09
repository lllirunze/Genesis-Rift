import { describe, expect, it } from "vitest";

import { createActiveCharacterSurvivalState, enterDownedIfNeeded } from "../survival/index.ts";
import {
  advanceBattleTurnOrder,
  createBattleAttackEligibilityInput,
  createBattleParticipantState,
  createBattleTurnOrderState,
  getCurrentBattleParticipantId,
} from "./battle-participant-state.ts";

describe("battle participant state", () => {
  it("uses factions and survival state to provide attack eligibility facts", () => {
    const attacker = createBattleParticipantState(
      "player_a",
      "PLAYER",
      createActiveCharacterSurvivalState("player_a"),
    );
    const defender = createBattleParticipantState(
      "npc_a",
      "NPC",
      createActiveCharacterSurvivalState("npc_a"),
    );

    expect(
      createBattleAttackEligibilityInput(attacker, defender, {
        hasActionPermission: true,
        targetIsVisible: true,
        targetIsInRange: true,
        resourcesAreSufficient: true,
        mapAllowsAttack: true,
      }),
    ).toMatchObject({ attackerCanAttack: true, targetIsAttackable: true });
  });

  it("prevents attacks against the same faction and lets order loop", () => {
    const active = createActiveCharacterSurvivalState("player_a");
    const attacker = createBattleParticipantState("player_a", "PLAYER", active);
    const ally = createBattleParticipantState(
      "player_b",
      "PLAYER",
      enterDownedIfNeeded(createActiveCharacterSurvivalState("player_b"), true).state,
    );
    const facts = {
      hasActionPermission: true,
      targetIsVisible: true,
      targetIsInRange: true,
      resourcesAreSufficient: true,
      mapAllowsAttack: true,
    };

    expect(createBattleAttackEligibilityInput(attacker, ally, facts).targetIsAttackable).toBe(
      false,
    );
    const first = createBattleTurnOrderState(["player_a", "npc_a"]);
    expect(getCurrentBattleParticipantId(first)).toBe("player_a");
    expect(getCurrentBattleParticipantId(advanceBattleTurnOrder(first))).toBe("npc_a");
    expect(
      getCurrentBattleParticipantId(advanceBattleTurnOrder(advanceBattleTurnOrder(first))),
    ).toBe("player_a");
  });
});
