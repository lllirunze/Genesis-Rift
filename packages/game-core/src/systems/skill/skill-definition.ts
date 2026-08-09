import { assertResourceId } from "@genesis-rift/shared";

import { SKILL_EFFECT_TYPES, SKILL_TARGET_TYPES, SKILL_TYPES } from "./skill-config.ts";

/** 描述技能释放方式。 */
export type SkillType = (typeof SKILL_TYPES)[number];
/** 描述技能能够选择的目标类型。 */
export type SkillTargetType = (typeof SKILL_TARGET_TYPES)[number];
/** 描述技能效果执行器的注册分类。 */
export type SkillEffectType = (typeof SKILL_EFFECT_TYPES)[number];

/** 描述一次技能释放需要支付的运行时资源。 */
export interface SkillResourceCost {
  readonly resourceId: string;
  readonly amount: number;
}

interface SkillEffectBase {
  readonly effectId: string;
  readonly effectType: SkillEffectType;
}

/** 描述将技能转换为一次统一攻击行为所需的攻击修正。 */
export interface SkillAttackEffect extends SkillEffectBase {
  readonly effectType: "attack";
  readonly damageType: "PHYSICAL" | "MAGICAL" | "TRUE";
  readonly attackModifier: number;
  readonly usesWeaponAttack: boolean;
  readonly criticalEnabled: boolean;
  readonly evasionEnabled: boolean;
}

/** 描述向目标施加状态定义的技能效果。 */
export interface SkillStatusAddEffect extends SkillEffectBase {
  readonly effectType: "status_add";
  readonly statusDefinitionId: string;
  readonly stacks: number;
}

/** 描述恢复目标指定运行时资源的技能效果。 */
export interface SkillResourceRestoreEffect extends SkillEffectBase {
  readonly effectType: "resource_restore";
  readonly resourceId: string;
  readonly amount: number;
}

/** 描述为目标增加护盾的技能效果。 */
export interface SkillShieldGrantEffect extends SkillEffectBase {
  readonly effectType: "shield_grant";
  readonly amount: number;
}

/** 描述引用地图系统强制位移定义的技能效果。 */
export interface SkillForcedDisplacementEffect extends SkillEffectBase {
  readonly effectType: "forced_displacement";
  readonly forcedDisplacementDefinitionId: string;
}

/** 描述技能可配置的全部基础效果。 */
export type SkillEffectDefinition =
  | SkillAttackEffect
  | SkillStatusAddEffect
  | SkillResourceRestoreEffect
  | SkillShieldGrantEffect
  | SkillForcedDisplacementEffect;

/** 描述不随运行过程改变的技能静态定义。 */
export interface SkillDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly description: string;
  readonly type: SkillType;
  readonly targetType: SkillTargetType;
  readonly range: number;
  readonly resourceCosts: readonly SkillResourceCost[];
  readonly cooldownTurns: number;
  readonly maxUsesPerTurn: number;
  readonly conditionIds: readonly string[];
  readonly effects: readonly SkillEffectDefinition[];
}

/** 描述以技能资源标识索引的只读技能定义注册表。 */
export type SkillDefinitionCatalog = Readonly<Record<string, SkillDefinition>>;

/**
 * 方法名：validateSkillDefinition
 * 作用：校验技能静态定义的标识、目标、消耗、限制和效果结构。
 * @param definition 需要校验的技能静态定义。
 * @returns 无返回值。
 * @throws 技能定义不符合 V1 配置规则时抛出错误。
 */
export function validateSkillDefinition(definition: SkillDefinition): void {
  assertResourceId(definition.definitionId, "skill");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!SKILL_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported skill type: ${definition.type}`);
  }

  if (!SKILL_TARGET_TYPES.includes(definition.targetType)) {
    throw new RangeError(`Unsupported skill target type: ${definition.targetType}`);
  }

  assertNonNegativeSafeInteger(definition.range, "range");
  assertNonNegativeSafeInteger(definition.cooldownTurns, "cooldownTurns");
  assertPositiveSafeInteger(definition.maxUsesPerTurn, "maxUsesPerTurn");
  validateUniqueNonEmptyStrings(definition.conditionIds, "conditionIds");
  validateResourceCosts(definition.resourceCosts);
  validateSkillEffects(definition.effects);

  if (definition.type === "active" && definition.effects.length === 0) {
    throw new Error("Active skills must define at least one effect");
  }
}

/**
 * 方法名：validateSkillDefinitionCatalog
 * 作用：校验技能注册表的索引、资源标识与定义内容保持一致且不重复。
 * @param catalog 需要校验的技能定义注册表。
 * @returns 无返回值。
 * @throws 注册表索引不匹配或技能名称重复时抛出错误。
 */
export function validateSkillDefinitionCatalog(catalog: SkillDefinitionCatalog): void {
  const names = new Set<string>();

  for (const [definitionId, definition] of Object.entries(catalog)) {
    if (definitionId !== definition.definitionId) {
      throw new Error(`Skill catalog key does not match definition id: ${definitionId}`);
    }

    validateSkillDefinition(definition);

    if (names.has(definition.name)) {
      throw new Error(`Duplicate skill name: ${definition.name}`);
    }

    names.add(definition.name);
  }
}

/**
 * 方法名：validateResourceCosts
 * 作用：校验技能资源消耗的资源标识唯一且消耗数量为正整数。
 * @param costs 需要校验的资源消耗数组。
 * @returns 无返回值。
 * @throws 资源标识重复或消耗数量非法时抛出错误。
 */
function validateResourceCosts(costs: readonly SkillResourceCost[]): void {
  const resourceIds = new Set<string>();

  for (const cost of costs) {
    assertNonEmptyString(cost.resourceId, "resourceCosts.resourceId");
    assertPositiveSafeInteger(cost.amount, "resourceCosts.amount");

    if (resourceIds.has(cost.resourceId)) {
      throw new Error(`Duplicate skill resource cost: ${cost.resourceId}`);
    }

    resourceIds.add(cost.resourceId);
  }
}

/**
 * 方法名：validateSkillEffects
 * 作用：校验效果标识唯一，并根据具体效果类型校验专属参数。
 * @param effects 需要校验的技能效果数组。
 * @returns 无返回值。
 * @throws 效果类型、标识或专属参数不合法时抛出错误。
 */
function validateSkillEffects(effects: readonly SkillEffectDefinition[]): void {
  const effectIds = new Set<string>();

  for (const effect of effects) {
    assertNonEmptyString(effect.effectId, "effects.effectId");

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate skill effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);

    if (!SKILL_EFFECT_TYPES.includes(effect.effectType)) {
      throw new RangeError(`Unsupported skill effect type: ${effect.effectType}`);
    }

    if (effect.effectType === "attack") {
      assertSafeInteger(effect.attackModifier, "attack.attackModifier");
      assertBoolean(effect.usesWeaponAttack, "attack.usesWeaponAttack");
      assertBoolean(effect.criticalEnabled, "attack.criticalEnabled");
      assertBoolean(effect.evasionEnabled, "attack.evasionEnabled");
      continue;
    }

    if (effect.effectType === "status_add") {
      assertNonEmptyString(effect.statusDefinitionId, "status_add.statusDefinitionId");
      assertPositiveSafeInteger(effect.stacks, "status_add.stacks");
      continue;
    }

    if (effect.effectType === "resource_restore") {
      assertNonEmptyString(effect.resourceId, "resource_restore.resourceId");
      assertPositiveSafeInteger(effect.amount, "resource_restore.amount");
      continue;
    }

    if (effect.effectType === "shield_grant") {
      assertPositiveSafeInteger(effect.amount, "shield_grant.amount");
      continue;
    }

    assertNonEmptyString(
      effect.forcedDisplacementDefinitionId,
      "forced_displacement.forcedDisplacementDefinitionId",
    );
  }
}

/**
 * 方法名：validateUniqueNonEmptyStrings
 * 作用：校验字符串数组不存在空白或重复的业务标识。
 * @param values 需要校验的字符串数组。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空或重复时抛出错误。
 */
function validateUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入为包含有效内容的字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空白时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验数值为可安全参与规则计算的非负整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值为负数、小数或超出安全整数范围时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验数值为正安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是正安全整数时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

/**
 * 方法名：assertSafeInteger
 * 作用：校验数值为允许作为攻击修正参与计算的安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是安全整数时抛出错误。
 */
function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}

/**
 * 方法名：assertBoolean
 * 作用：校验输入使用真正的布尔值。
 * @param value 需要校验的布尔值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是布尔值时抛出错误。
 */
function assertBoolean(value: boolean, field: string): void {
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean`);
  }
}
