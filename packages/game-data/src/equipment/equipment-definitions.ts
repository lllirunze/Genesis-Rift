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
} as const satisfies EquipmentDefinition;

/** 当前版本可用于装备栏与制造系统的正式装备定义。 */
export const EQUIPMENT_DEFINITION_CATALOG = {
  [HEAVY_PLATE_ARMOR_EQUIPMENT_DEFINITION.definitionId]: HEAVY_PLATE_ARMOR_EQUIPMENT_DEFINITION,
  [LONG_SWORD_EQUIPMENT_DEFINITION.definitionId]: LONG_SWORD_EQUIPMENT_DEFINITION,
  [TRAVEL_BOOTS_EQUIPMENT_DEFINITION.definitionId]: TRAVEL_BOOTS_EQUIPMENT_DEFINITION,
} as const satisfies EquipmentDefinitionCatalog;
