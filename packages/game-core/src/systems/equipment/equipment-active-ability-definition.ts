import {
  EQUIPMENT_ACTIVE_ABILITY_TARGET_TYPES,
  EQUIPMENT_ACTIVE_EFFECT_TYPES,
} from "./equipment-config.ts";

/** 描述装备主动能力可选择的目标范围类型。 */
export type EquipmentActiveAbilityTargetType =
  (typeof EQUIPMENT_ACTIVE_ABILITY_TARGET_TYPES)[number];

/** 描述装备主动能力可委托执行的效果类型。 */
export type EquipmentActiveEffectType = (typeof EQUIPMENT_ACTIVE_EFFECT_TYPES)[number];

/** 描述装备主动能力的一项配置效果。 */
export interface EquipmentActiveEffectDefinition {
  readonly effectId: string;
  readonly effectType: EquipmentActiveEffectType;
  readonly parameters: Readonly<Record<string, boolean | number | string>>;
}

/** 描述装备携带的可主动使用能力。 */
export interface EquipmentActiveAbilityDefinition {
  readonly abilityId: string;
  readonly description: string;
  readonly targetType: EquipmentActiveAbilityTargetType;
  readonly range: number;
  readonly cooldownTurns: number;
  readonly maxUsesPerTurn: number;
  readonly conditionIds: readonly string[];
  readonly effects: readonly EquipmentActiveEffectDefinition[];
}

/**
 * 方法名：validateEquipmentActiveAbilityDefinition
 * 作用：校验装备主动能力的目标、限制和效果配置保持完整且可执行。
 * @param definition 需要校验的装备主动能力定义。
 * @returns 无返回值。
 * @throws 能力标识、目标、次数或效果配置非法时抛出错误。
 */
export function validateEquipmentActiveAbilityDefinition(
  definition: EquipmentActiveAbilityDefinition,
): void {
  assertNonEmptyString(definition.abilityId, "activeAbility.abilityId");
  assertNonEmptyString(definition.description, "activeAbility.description");

  if (!EQUIPMENT_ACTIVE_ABILITY_TARGET_TYPES.includes(definition.targetType)) {
    throw new RangeError(`Unsupported equipment ability target type: ${definition.targetType}`);
  }

  assertNonNegativeSafeInteger(definition.range, "activeAbility.range");
  assertNonNegativeSafeInteger(definition.cooldownTurns, "activeAbility.cooldownTurns");
  assertPositiveSafeInteger(definition.maxUsesPerTurn, "activeAbility.maxUsesPerTurn");
  validateUniqueNonEmptyStrings(definition.conditionIds, "activeAbility.conditionIds");

  if (definition.effects.length === 0) {
    throw new Error("Equipment active abilities must define at least one effect");
  }

  const effectIds = new Set<string>();

  for (const effect of definition.effects) {
    assertNonEmptyString(effect.effectId, "activeAbility.effects.effectId");

    if (!EQUIPMENT_ACTIVE_EFFECT_TYPES.includes(effect.effectType)) {
      throw new RangeError(`Unsupported equipment active effect type: ${effect.effectType}`);
    }

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate equipment active effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);
  }
}

/** 校验字符串集合不存在空白或重复的条件标识。 */
function validateUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (seen.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    seen.add(value);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
