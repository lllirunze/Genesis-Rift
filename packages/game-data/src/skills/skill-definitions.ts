import type { SkillDefinition, SkillDefinitionCatalog } from "@genesis-rift/game-core";

/** 战士近战技能示例，读取物理攻击并保留武器攻击力。 */
export const POWER_STRIKE_SKILL_DEFINITION = {
  definitionId: "skill_000001",
  name: "powerStrike",
  description: "Deliver a powerful melee strike.",
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
} as const satisfies SkillDefinition;

/** 法师远程技能示例，读取法术攻击且不使用武器攻击力。 */
export const ARCANE_BOLT_SKILL_DEFINITION = {
  definitionId: "skill_000002",
  name: "arcaneBolt",
  description: "Launch an arcane projectile at a distant target.",
  type: "active",
  targetType: "single_target",
  range: 3,
  resourceCosts: [],
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
} as const satisfies SkillDefinition;

/** 游侠辅助技能示例，为自身施加现有的移动增益状态。 */
export const WIND_BLESSING_SKILL_DEFINITION = {
  definitionId: "skill_000003",
  name: "windBlessing",
  description: "Call upon the wind to improve movement for a short duration.",
  type: "active",
  targetType: "self",
  range: 0,
  resourceCosts: [],
  cooldownTurns: 2,
  maxUsesPerTurn: 1,
  conditionIds: [],
  effects: [
    {
      effectId: "status",
      effectType: "status_add",
      statusDefinitionId: "buff_000002",
      stacks: 1,
    },
  ],
} as const satisfies SkillDefinition;

/** 当前版本提供的技能静态定义注册表。 */
export const SKILL_DEFINITION_CATALOG = {
  [POWER_STRIKE_SKILL_DEFINITION.definitionId]: POWER_STRIKE_SKILL_DEFINITION,
  [ARCANE_BOLT_SKILL_DEFINITION.definitionId]: ARCANE_BOLT_SKILL_DEFINITION,
  [WIND_BLESSING_SKILL_DEFINITION.definitionId]: WIND_BLESSING_SKILL_DEFINITION,
} as const satisfies SkillDefinitionCatalog;
