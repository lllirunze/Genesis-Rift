import { describe, expect, it } from "vitest";

import {
  advanceDownedStateAtTurnEnd,
  canCharacterPerformAttack,
  createActiveCharacterSurvivalState,
  enterDownedIfNeeded,
  recoverDownedCharacter,
} from "./character-survival-state.ts";

describe("character survival state", () => {
  it("enters downed state only once when health is depleted", () => {
    const active = createActiveCharacterSurvivalState("player.a");
    const entered = enterDownedIfNeeded(active, true);

    expect(entered).toEqual({
      outcome: "ENTERED_DOWNED",
      state: { participantId: "player.a", status: "DOWNED", downedTurnsRemaining: 3 },
    });
    expect(enterDownedIfNeeded(entered.state, true)).toEqual({
      outcome: "UNCHANGED",
      state: entered.state,
    });
    expect(canCharacterPerformAttack(entered.state)).toBe(false);
  });

  it("turns a downed character into a dead character after the final own turn", () => {
    let state = enterDownedIfNeeded(createActiveCharacterSurvivalState("player.a"), true).state;

    state = advanceDownedStateAtTurnEnd(state).state;
    state = advanceDownedStateAtTurnEnd(state).state;
    const result = advanceDownedStateAtTurnEnd(state);

    expect(result).toEqual({
      outcome: "DIED",
      state: { participantId: "player.a", status: "DEAD", downedTurnsRemaining: 0 },
    });
    expect(canCharacterPerformAttack(result.state)).toBe(false);
  });

  it("restores a downed character only after positive health recovery", () => {
    const downed = enterDownedIfNeeded(createActiveCharacterSurvivalState("player.a"), true).state;

    expect(recoverDownedCharacter(downed, 5)).toEqual({
      participantId: "player.a",
      status: "ACTIVE",
      downedTurnsRemaining: 0,
    });
    expect(() => recoverDownedCharacter(downed, 0)).toThrow("positive safe integer");
  });
});
