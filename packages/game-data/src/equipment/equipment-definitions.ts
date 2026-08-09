import type { EquipmentDefinition, EquipmentDefinitionCatalog } from "@genesis-rift/game-core";

/** 长剑提供独立武器攻击力，伤害结算时与角色物理攻击力相加。 */
export const LONG_SWORD_EQUIPMENT_DEFINITION = {
  definitionId: "equip_000002",
  name: "longSword",
  type: "weapon",
  quality: "excellent",
  corePosition: "mainHand",
  allowDuplicateEquipping: false,
  weaponAttack: 12,
  attributeEffects: [],
  activeAbility: {
    abilityId: "longSword.guardStance",
    description: "Gain a small shield before the next exchange.",
    targetType: "self",
    range: 0,
    cooldownTurns: 2,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [{ effectId: "shield", effectType: "shield_grant", parameters: { amount: 4 } }],
  },
} as const satisfies EquipmentDefinition;

/** 重甲提高最大生命，作为承伤路线的基础装备。 */
export const HEAVY_PLATE_ARMOR_EQUIPMENT_DEFINITION = {
  definitionId: "equip_000001",
  name: "heavyPlateArmor",
  type: "armor",
  quality: "rare",
  corePosition: "body",
  allowDuplicateEquipping: false,
  weaponAttack: 0,
  attributeEffects: [
    { effectId: "maxHealth", targetType: "derived", targetAttribute: "maxHealth", value: 10 },
  ],
  activeAbility: {
    abilityId: "heavyPlateArmor.fortify",
    description: "Brace the armor to gain a stronger shield.",
    targetType: "self",
    range: 0,
    cooldownTurns: 3,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [{ effectId: "shield", effectType: "shield_grant", parameters: { amount: 8 } }],
  },
} as const satisfies EquipmentDefinition;

/** 旅行靴提高移动力，作为探索路线的基础装备。 */
export const TRAVEL_BOOTS_EQUIPMENT_DEFINITION = {
  definitionId: "equip_000003",
  name: "travelBoots",
  type: "shoes",
  quality: "common",
  corePosition: "feet",
  allowDuplicateEquipping: false,
  weaponAttack: 0,
  attributeEffects: [
    {
      effectId: "movementRange",
      targetType: "derived",
      targetAttribute: "movementRange",
      value: 1,
    },
  ],
  activeAbility: {
    abilityId: "travelBoots.quickStep",
    description: "Gain temporary movement for the current action.",
    targetType: "self",
    range: 0,
    cooldownTurns: 1,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [
      { effectId: "movement", effectType: "movement_modify", parameters: { amount: 1 } },
    ],
  },
} as const satisfies EquipmentDefinition;

/** 幸运护符作为饰品示例，强调构筑方向而非直接战斗数值。 */
export const FORTUNE_PENDANT_EQUIPMENT_DEFINITION = {
  definitionId: "equip_000004",
  name: "fortunePendant",
  type: "accessory",
  quality: "excellent",
  corePosition: "accessory",
  allowDuplicateEquipping: false,
  weaponAttack: 0,
  attributeEffects: [{ effectId: "luck", targetType: "derived", targetAttribute: "luck", value: 1 }],
  activeAbility: {
    abilityId: "fortunePendant.scout",
    description: "Reveal nearby map information.",
    targetType: "tile",
    range: 2,
    cooldownTurns: 3,
    maxUsesPerTurn: 1,
    conditionIds: [],
    effects: [{ effectId: "reveal", effectType: "map_reveal", parameters: { radius: 1 } }],
  },
} as const satisfies EquipmentDefinition;

/** 测绘透镜作为特殊装备示例，提供探索系统的显式扩展接口。 */
export const SURVEYOR_LENS_EQUIPMENT_DEFINITION = {
  definitionId: "equip_000005",
  name: "surveyorLens",
  type: "special",
  quality: "rare",
  corePosition: "special",
  allowDuplicateEquipping: false,
  weaponAttack: 0,
  attributeEffects: [],
  activeAbility: {
    abilityId: "surveyorLens.scan",
    description: "Reveal an unexplored tile and its immediate surroundings.",
    targetType: "tile",
    range: 3,
    cooldownTurns: 2,
    maxUsesPerTurn: 1,
    conditionIds: ["target.unexplored"],
    effects: [{ effectId: "scan", effectType: "map_reveal", parameters: { radius: 1 } }],
  },
} as const satisfies EquipmentDefinition;

/** 当前版本可用于装备栏与制造系统的正式装备定义。 */
export const EQUIPMENT_DEFINITION_CATALOG = {
  [HEAVY_PLATE_ARMOR_EQUIPMENT_DEFINITION.definitionId]: HEAVY_PLATE_ARMOR_EQUIPMENT_DEFINITION,
  [LONG_SWORD_EQUIPMENT_DEFINITION.definitionId]: LONG_SWORD_EQUIPMENT_DEFINITION,
  [TRAVEL_BOOTS_EQUIPMENT_DEFINITION.definitionId]: TRAVEL_BOOTS_EQUIPMENT_DEFINITION,
  [FORTUNE_PENDANT_EQUIPMENT_DEFINITION.definitionId]: FORTUNE_PENDANT_EQUIPMENT_DEFINITION,
  [SURVEYOR_LENS_EQUIPMENT_DEFINITION.definitionId]: SURVEYOR_LENS_EQUIPMENT_DEFINITION,
} as const satisfies EquipmentDefinitionCatalog;
