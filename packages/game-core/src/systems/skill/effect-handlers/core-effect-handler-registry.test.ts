import { describe, expect, it, vi } from "vitest";

import { executeSkillEffects } from "../execute-skill-effects.ts";
import type { SkillDefinition } from "../skill-definition.ts";
import { createCoreSkillEffectHandlerRegistry } from "./core-effect-handler-registry.ts";

const MULTI_EFFECT_SKILL = {
  definitionId: "skill_000001",
  name: "battlefieldControl",
  description: "Apply several basic skill effects.",
  type: "active",
  targetType: "single_target",
  range: 2,
  resourceCosts: [],
  cooldownTurns: 0,
  maxUsesPerTurn: 1,
  conditionIds: [],
  effects: [
    {
      effectId: "attack",
      effectType: "attack",
      damageType: "PHYSICAL",
      attackModifier: 1,
      usesWeaponAttack: true,
      criticalEnabled: true,
      evasionEnabled: true,
    },
    {
      effectId: "status",
      effectType: "status_add",
      statusDefinitionId: "buff_000001",
      stacks: 1,
    },
    {
      effectId: "restore",
      effectType: "resource_restore",
      resourceId: "health",
      amount: 1,
    },
    {
      effectId: "shield",
      effectType: "shield_grant",
      amount: 1,
    },
    {
      effectId: "move",
      effectType: "forced_displacement",
      forcedDisplacementDefinitionId: "displacement.windGust",
    },
  ],
} as const satisfies SkillDefinition;

describe("createCoreSkillEffectHandlerRegistry", () => {
  it("forwards every V1 effect type to its designated system dependency", () => {
    const dependencies = {
      resolveAttack: vi.fn(() => "attack"),
      applyStatus: vi.fn(() => "status"),
      restoreResource: vi.fn(() => "resource"),
      grantShield: vi.fn(() => "shield"),
      settleForcedDisplacement: vi.fn(() => "movement"),
    };
    const registry = createCoreSkillEffectHandlerRegistry(dependencies);

    const results = executeSkillEffects(
      MULTI_EFFECT_SKILL,
      { executionId: "skill-use-1", casterId: "player-a", targetIds: ["player-b"] },
      registry,
    );

    expect(results.map((result) => result.output)).toEqual([
      "attack",
      "status",
      "resource",
      "shield",
      "movement",
    ]);
    expect(dependencies.resolveAttack).toHaveBeenCalledTimes(1);
    expect(dependencies.applyStatus).toHaveBeenCalledTimes(1);
    expect(dependencies.restoreResource).toHaveBeenCalledTimes(1);
    expect(dependencies.grantShield).toHaveBeenCalledTimes(1);
    expect(dependencies.settleForcedDisplacement).toHaveBeenCalledTimes(1);
  });
});
