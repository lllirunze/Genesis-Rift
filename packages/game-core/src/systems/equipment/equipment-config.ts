/** 当前模块对外公开的只读配置值。 */
export const EQUIPMENT_TYPES = ["weapon", "armor", "shoes", "accessory", "special"] as const;

/** 当前模块对外公开的只读配置值。 */
export const EQUIPMENT_SLOTS = [
  "weapon",
  "armor",
  "shoes",
  "accessory1",
  "accessory2",
  "special",
] as const;

/** 装备主动能力在 V1 可选择的目标范围类型。 */
export const EQUIPMENT_ACTIVE_ABILITY_TARGET_TYPES = ["self", "single_target", "tile"] as const;

/** 装备主动能力在 V1 可委托给业务系统处理的基础效果类型。 */
export const EQUIPMENT_ACTIVE_EFFECT_TYPES = [
  "attack",
  "shield_grant",
  "movement_modify",
  "map_reveal",
] as const;
