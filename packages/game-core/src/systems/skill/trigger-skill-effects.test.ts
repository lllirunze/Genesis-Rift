import { describe, expect, it } from "vitest";

import { SkillEffectHandlerRegistry, type SkillEffectHandler } from "./skill-effect-handler.ts";
import { createCharacterSkillState } from "./skill-runtime-state.ts";
import { executeTriggeredSkillEffects } from "./trigger-skill-effects.ts";
import type { SkillDefinitionCatalog } from "./skill-definition.ts";

/** 触发技能测试使用的最小静态定义注册表。 */
const SKILLS: SkillDefinitionCatalog = {
  skill_000010: {
    definitionId: "skill_000010",
    name: "thornResponse",
    description: "Respond to received damage.",
    type: "triggered",
    targetType: "single_target",
    range: 1,
    resourceCosts: [],
    cooldownTurns: 0,
    maxUsesPerTurn: 1,
    conditionIds: [],
    triggerEventTypes: ["DAMAGE_RECEIVED"],
    effects: [{ effectId: "shield", effectType: "shield_grant", amount: 3 }],
  },
  skill_000011: {
    definitionId: "skill_000011",
    name: "turnAura",
    description: "Trigger at turn start.",
    type: "passive",
    targetType: "self",
    range: 0,
    resourceCosts: [],
    cooldownTurns: 0,
    maxUsesPerTurn: 1,
    conditionIds: [],
    triggerEventTypes: ["TURN_START"],
    effects: [{ effectId: "shield", effectType: "shield_grant", amount: 1 }],
  },
};

describe("executeTriggeredSkillEffects", () => {
  it("only executes passive and triggered skills subscribed to the notified timing", () => {
    const state = createCharacterSkillState("player_a", Object.keys(SKILLS), SKILLS);
    const registry = new SkillEffectHandlerRegistry().register(createShieldHandler());

    const results = executeTriggeredSkillEffects(
      state,
      SKILLS,
      {
        eventId: "battle_1",
        eventType: "DAMAGE_RECEIVED",
        sourceId: "player_b",
        targetIds: ["player_a"],
      },
      registry,
    );

    expect(results).toEqual([
      {
        definitionId: "skill_000010",
        effectResults: [{ effectId: "shield", outcome: "applied", output: 3 }],
      },
    ]);
  });
});

/** 创建用于观察触发执行的最小护盾效果处理器。 */
function createShieldHandler(): SkillEffectHandler<"shield_grant"> {
  return {
    effectType: "shield_grant",
    execute(effect) {
      if (effect.effectType !== "shield_grant") {
        throw new Error("Unexpected effect type");
      }

      return { effectId: effect.effectId, outcome: "applied", output: effect.amount };
    },
  };
}
