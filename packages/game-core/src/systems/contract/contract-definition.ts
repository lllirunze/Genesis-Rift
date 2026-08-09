import { assertResourceId } from "@genesis-rift/shared";

import {
  CONTRACT_DEBUFF_TRIGGER_TYPES,
  CONTRACT_EFFECT_TYPES,
  CONTRACT_STRENGTHS,
  type ContractDebuffTriggerType,
  type ContractEffectType,
  type ContractStrength,
} from "./contract-config.ts";

/** 描述契约向属性或规则系统注入的一项永久效果。 */
export interface ContractEffectDefinition {
  readonly effectId: string;
  readonly type: ContractEffectType;
  readonly value: number | null;
  readonly tags: readonly string[];
}

/** 描述以个人回合或世界阶段触发的契约负面效果条件。 */
export interface ContractDebuffTriggerDefinition {
  readonly type: ContractDebuffTriggerType;
  readonly personalTurnDelay: number;
  readonly worldStageId: string | null;
  readonly latestPersonalTurn: number | null;
}

/** 描述不会随对局过程改变的神鬼契约资源定义。 */
export interface ContractDefinition {
  readonly contractId: string;
  readonly name: string;
  readonly description: string;
  readonly strength: ContractStrength;
  readonly baseWeight: number;
  readonly triggerTags: readonly string[];
  readonly allowedWorldStageIds: readonly string[];
  readonly buff: ContractEffectDefinition;
  readonly debuff: ContractEffectDefinition;
  readonly debuffTrigger: ContractDebuffTriggerDefinition;
}

/** 描述以契约资源标识索引的只读契约定义注册表。 */
export type ContractDefinitionCatalog = Readonly<Record<string, ContractDefinition>>;

/**
 * 方法名：validateContractDefinition
 * 作用：校验神鬼契约资源的标识、效果、触发条件与随机筛选配置。
 * @param definition 需要校验的静态契约资源。
 * @returns 无返回值。
 * @throws 契约字段为空、效果非法或触发条件不完整时抛出错误。
 */
export function validateContractDefinition(definition: ContractDefinition): void {
  assertResourceId(definition.contractId, "contract");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!CONTRACT_STRENGTHS.includes(definition.strength)) {
    throw new RangeError(`Unsupported contract strength: ${definition.strength}`);
  }

  assertNonNegativeSafeInteger(definition.baseWeight, "baseWeight");
  validateUniqueNonEmptyStrings(definition.triggerTags, "triggerTags");
  validateUniqueNonEmptyStrings(definition.allowedWorldStageIds, "allowedWorldStageIds");
  validateContractEffectDefinition(definition.buff, "buff");
  validateContractEffectDefinition(definition.debuff, "debuff");
  validateContractDebuffTriggerDefinition(definition.debuffTrigger);
}

/**
 * 方法名：validateContractDefinitionCatalog
 * 作用：校验契约资源注册表的键值一致性与全部资源定义。
 * @param catalog 需要校验的契约资源注册表。
 * @returns 无返回值。
 * @throws 注册表键与契约资源标识不一致时抛出错误。
 */
export function validateContractDefinitionCatalog(catalog: ContractDefinitionCatalog): void {
  for (const [contractId, definition] of Object.entries(catalog)) {
    validateContractDefinition(definition);

    if (contractId !== definition.contractId) {
      throw new Error(`Contract catalog key ${contractId} does not match ${definition.contractId}`);
    }
  }
}

/**
 * 方法名：getContractDefinition
 * 作用：从已加载的契约资源注册表读取指定静态定义。
 * @param catalog 已校验的契约资源注册表。
 * @param contractId 需要读取的契约资源标识。
 * @returns 对应的神鬼契约静态定义。
 * @throws 契约资源不存在时抛出错误。
 */
export function getContractDefinition(
  catalog: ContractDefinitionCatalog,
  contractId: string,
): ContractDefinition {
  const definition = catalog[contractId];

  if (definition === undefined) {
    throw new Error(`Unknown contract definition: ${contractId}`);
  }

  return definition;
}

/** 校验契约效果的标识、类型、数值与标签。 */
function validateContractEffectDefinition(effect: ContractEffectDefinition, field: string): void {
  assertNonEmptyString(effect.effectId, `${field}.effectId`);

  if (!CONTRACT_EFFECT_TYPES.includes(effect.type)) {
    throw new RangeError(`Unsupported ${field} effect type: ${effect.type}`);
  }

  if (effect.value !== null && !Number.isSafeInteger(effect.value)) {
    throw new RangeError(`${field}.value must be a safe integer or null`);
  }

  validateUniqueNonEmptyStrings(effect.tags, `${field}.tags`);
}

/** 校验负面效果触发条件的必要字段与回合边界。 */
function validateContractDebuffTriggerDefinition(trigger: ContractDebuffTriggerDefinition): void {
  if (!CONTRACT_DEBUFF_TRIGGER_TYPES.includes(trigger.type)) {
    throw new RangeError(`Unsupported contract debuff trigger type: ${trigger.type}`);
  }

  assertPositiveSafeInteger(trigger.personalTurnDelay, "debuffTrigger.personalTurnDelay");

  if (trigger.type === "PERSONAL_TURN") {
    if (trigger.worldStageId !== null || trigger.latestPersonalTurn !== null) {
      throw new Error("Personal turn contract triggers cannot define world stage fallback fields");
    }
    return;
  }

  assertNonEmptyString(trigger.worldStageId ?? "", "debuffTrigger.worldStageId");
  assertPositiveSafeInteger(trigger.latestPersonalTurn ?? 0, "debuffTrigger.latestPersonalTurn");

  if (trigger.latestPersonalTurn! < trigger.personalTurnDelay) {
    throw new RangeError("Contract latest personal turn cannot be lower than the initial delay");
  }
}

/** 校验字符串配置数组中的元素均非空且不重复。 */
function validateUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (seen.has(value)) {
      throw new Error(`${field} cannot contain duplicate values: ${value}`);
    }

    seen.add(value);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
