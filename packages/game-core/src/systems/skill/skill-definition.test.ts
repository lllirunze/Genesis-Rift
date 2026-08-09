import { describe, expect, it } from "vitest";

import { validateSkillDefinition } from "./skill-definition.ts";

describe("validateSkillDefinition", () => {
  it("accepts an active skill with a standard attack effect", () => {
    expect(() =>
      validateSkillDefinition({
        definitionId: "skill_000001",
        name: "powerStrike",
        description: "Deliver a powerful strike.",
        type: "active",
        targetType: "single_target",
        range: 1,
        resourceCosts: [],
        cooldownTurns: 1,
        maxUsesPerTurn: 1,
        conditionIds: [],
        effects: [
          {
            effectId: "attack",
            effectType: "attack",
            damageType: "PHYSICAL",
            attackModifier: 8,
            usesWeaponAttack: true,
            criticalEnabled: true,
            evasionEnabled: true,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects duplicate resource costs", () => {
    expect(() =>
      validateSkillDefinition({
        definitionId: "skill_000001",
        name: "resourceBurst",
        description: "Spend duplicated resources.",
        type: "active",
        targetType: "self",
        range: 0,
        resourceCosts: [
          { resourceId: "mana", amount: 1 },
          { resourceId: "mana", amount: 2 },
        ],
        cooldownTurns: 0,
        maxUsesPerTurn: 1,
        conditionIds: [],
        effects: [
          {
            effectId: "shield",
            effectType: "shield_grant",
            amount: 1,
          },
        ],
      }),
    ).toThrow("Duplicate skill resource cost: mana");
  });
});
