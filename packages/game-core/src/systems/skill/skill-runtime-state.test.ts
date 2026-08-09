import { describe, expect, it } from "vitest";

import type { SkillDefinitionCatalog } from "./skill-definition.ts";
import {
  advanceCharacterSkillStateAtTurnEnd,
  commitSkillUse,
  createCharacterSkillState,
} from "./skill-runtime-state.ts";

const SKILLS = {
  skill_000001: {
    definitionId: "skill_000001",
    name: "powerStrike",
    description: "Deliver a powerful strike.",
    type: "active",
    targetType: "single_target",
    range: 1,
    resourceCosts: [],
    cooldownTurns: 2,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [
      {
        effectId: "shield",
        effectType: "shield_grant",
        amount: 1,
      },
    ],
  },
} as const satisfies SkillDefinitionCatalog;

describe("character skill state", () => {
  it("commits cooldown and clears the turn usage while advancing the cooldown", () => {
    const initial = createCharacterSkillState("player-a", ["skill_000001"], SKILLS);
    const used = commitSkillUse(initial, SKILLS.skill_000001);
    const firstTurnEnd = advanceCharacterSkillStateAtTurnEnd(used.state);
    const secondTurnEnd = advanceCharacterSkillStateAtTurnEnd(firstTurnEnd);

    expect(used.entry).toMatchObject({ remainingCooldownTurns: 2, usesThisTurn: 1, totalUses: 1 });
    expect(firstTurnEnd.entries.skill_000001).toMatchObject({
      remainingCooldownTurns: 1,
      usesThisTurn: 0,
      totalUses: 1,
    });
    expect(secondTurnEnd.entries.skill_000001).toMatchObject({
      remainingCooldownTurns: 0,
      usesThisTurn: 0,
      totalUses: 1,
    });
  });
});
