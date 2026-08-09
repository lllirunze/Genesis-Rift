import { describe, expect, it } from "vitest";

import {
  advanceReincarnationProtectionAtTurnEnd,
  breakReincarnationProtectionForHostileAction,
  canBeTargetedByHostileAction,
  canInitiateHostileAction,
  createReincarnationProtection,
} from "./reincarnation-protection.ts";

describe("reincarnation protection", () => {
  it("默认持续三个自身回合，并在第三次结束后移除", () => {
    let protection = createReincarnationProtection("player_a");

    expect(protection.remainingTurns).toBe(3);
    protection = advanceReincarnationProtectionAtTurnEnd(protection)!;
    protection = advanceReincarnationProtectionAtTurnEnd(protection)!;

    expect(advanceReincarnationProtectionAtTurnEnd(protection)).toBeNull();
  });

  it("保护期间不能作为主动敌对目标，主动敌对行为会移除保护", () => {
    const protection = createReincarnationProtection("player_a");

    expect(canBeTargetedByHostileAction(protection)).toBe(false);
    expect(canInitiateHostileAction(protection)).toBe(true);
    expect(breakReincarnationProtectionForHostileAction(protection)).toBeNull();
  });
});
