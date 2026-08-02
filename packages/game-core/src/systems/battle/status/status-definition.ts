import type { PrimaryAttribute } from "@genesis-rift/shared";

import { STATUS_KINDS } from "./status-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type StatusKind = (typeof STATUS_KINDS)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusDuration {
  readonly turns: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusRemovalPolicy {
  readonly dispellable: boolean;
  readonly removeOnDeath: boolean;
}

interface StatusAttributeEffectBase {
  readonly effectType: "attribute_modifier";
  readonly effectId: string;
  readonly valuePerStack: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusPrimaryAttributeEffect extends StatusAttributeEffectBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusDerivedAttributeEffect extends StatusAttributeEffectBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type StatusEffect = StatusPrimaryAttributeEffect | StatusDerivedAttributeEffect;

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface StatusDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly description: string;
  readonly kind: StatusKind;
  readonly tags: readonly string[];
  readonly duration: StatusDuration;
  readonly maxStacks: number;
  readonly removal: StatusRemovalPolicy;
  readonly effects: readonly StatusEffect[];
}

/** 描述以标识索引业务定义的只读注册表。 */
export type StatusDefinitionCatalog = Readonly<Record<string, StatusDefinition>>;

/**
 * 方法名：validateStatusDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateStatusDefinition(definition: StatusDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!STATUS_KINDS.includes(definition.kind)) {
    throw new RangeError(`Unsupported status kind: ${definition.kind}`);
  }

  validateUniqueNonEmptyStrings(definition.tags, "tags");
  validateDuration(definition.duration);
  assertPositiveSafeInteger(definition.maxStacks, "maxStacks");
  validateEffects(definition.effects);
}

/**
 * 方法名：validateStatusDefinitions
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateStatusDefinitions(definitions: readonly StatusDefinition[]): void {
  const definitionIds = new Set<string>();
  const names = new Set<string>();

  for (const definition of definitions) {
    validateStatusDefinition(definition);

    if (definitionIds.has(definition.definitionId)) {
      throw new Error(`Duplicate status definition id: ${definition.definitionId}`);
    }

    if (names.has(definition.name)) {
      throw new Error(`Duplicate status name: ${definition.name}`);
    }

    definitionIds.add(definition.definitionId);
    names.add(definition.name);
  }
}

/**
 * 方法名：validateDuration
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param duration 方法所需的 duration 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateDuration(duration: StatusDuration): void {
  assertPositiveSafeInteger(duration.turns, "duration.turns");
}

/**
 * 方法名：validateEffects
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param effects 方法所需的 effects 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateEffects(effects: readonly StatusEffect[]): void {
  const effectIds = new Set<string>();

  for (const effect of effects) {
    assertNonEmptyString(effect.effectId, "effects.effectId");

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate status effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);

    if (effect.effectType !== "attribute_modifier") {
      throw new RangeError(`Unsupported status effect type: ${effect.effectType}`);
    }

    if (!Number.isSafeInteger(effect.valuePerStack)) {
      throw new TypeError(`Status effect ${effect.effectId} valuePerStack must be a safe integer`);
    }

    if (effect.targetType === "derived") {
      assertNonEmptyString(effect.targetAttribute, `${effect.effectId}.targetAttribute`);
    }
  }
}

/**
 * 方法名：validateUniqueNonEmptyStrings
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param values 方法所需的 values 参数。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
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
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
