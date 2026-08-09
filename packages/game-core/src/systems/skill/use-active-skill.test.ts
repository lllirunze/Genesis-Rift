import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { CharacterResourceState } from "../character/index.ts";
import type { SkillDefinitionCatalog } from "./skill-definition.ts";
import { SkillEffectHandlerRegistry } from "./skill-effect-handler.ts";
import { createCharacterSkillState } from "./skill-runtime-state.ts";
import { useActiveSkill } from "./use-active-skill.ts";

const SKILLS = {
  skill_000001: {
    definitionId: "skill_000001",
    name: "arcaneBolt",
    description: "Launch an arcane projectile.",
    type: "active",
    targetType: "single_target",
    range: 3,
    resourceCosts: [{ resourceId: "mana", amount: 3 }],
    cooldownTurns: 1,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [
      {
        effectId: "attack",
        effectType: "attack",
        damageType: "MAGICAL",
        attackModifier: 6,
        usesWeaponAttack: false,
        criticalEnabled: true,
        evasionEnabled: true,
      },
    ],
  },
} as const satisfies SkillDefinitionCatalog;

const RESOURCE_STATE: CharacterResourceState<"mana"> = {
  playerId: "player-a" as PlayerId,
  resources: {
    mana: { current: 5, minimum: 0, maximum: 5 },
  },
};

describe("useActiveSkill", () => {
  it("deducts resources, commits cooldown and delegates configured effects", () => {
    const registry = new SkillEffectHandlerRegistry();
    registry.register({
      effectType: "attack",
      execute(effect) {
        if (effect.effectType !== "attack") {
          throw new Error("Unexpected skill effect type");
        }

        return { effectId: effect.effectId, outcome: "applied", output: effect.attackModifier };
      },
    });
    const skillState = createCharacterSkillState("player-a", ["skill_000001"], SKILLS);

    const result = useActiveSkill(
      skillState,
      SKILLS.skill_000001,
      {
        eligibility: {
          conditionsSatisfied: true,
          targetIsValid: true,
          targetIsInRange: true,
          resourcesAreSufficient: true,
        },
        resourceState: RESOURCE_STATE,
        effectContext: {
          executionId: "skill-use-1",
          casterId: "player-a",
          targetIds: ["player-b"],
        },
      },
      registry,
    );

    expect(result.resourceState.resources.mana.current).toBe(2);
    expect(result.skillState.entries.skill_000001).toMatchObject({
      remainingCooldownTurns: 1,
      usesThisTurn: 1,
      totalUses: 1,
    });
    expect(result.effectResults).toEqual([{ effectId: "attack", outcome: "applied", output: 6 }]);
  });

  it("does not commit state when a required effect handler is missing", () => {
    const skillState = createCharacterSkillState("player-a", ["skill_000001"], SKILLS);

    expect(() =>
      useActiveSkill(
        skillState,
        SKILLS.skill_000001,
        {
          eligibility: {
            conditionsSatisfied: true,
            targetIsValid: true,
            targetIsInRange: true,
            resourcesAreSufficient: true,
          },
          resourceState: RESOURCE_STATE,
          effectContext: {
            executionId: "skill-use-1",
            casterId: "player-a",
            targetIds: ["player-b"],
          },
        },
        new SkillEffectHandlerRegistry(),
      ),
    ).toThrow("Skill effect handler not registered: attack");

    expect(skillState.entries.skill_000001).toMatchObject({
      remainingCooldownTurns: 0,
      usesThisTurn: 0,
    });
    expect(RESOURCE_STATE.resources.mana.current).toBe(5);
  });
});
