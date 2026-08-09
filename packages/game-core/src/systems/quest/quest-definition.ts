import { assertResourceId, isStandardQuality, type StandardQuality } from "@genesis-rift/shared";

import {
  QUEST_COMPLETION_RULES,
  QUEST_OBJECTIVE_TYPES,
  QUEST_TYPES,
  type QuestCompletionRule,
  type QuestObjectiveType,
} from "./quest-config.ts";

/** 描述任务的来源类型。 */
export type QuestIssuerType = "NPC" | "LOCATION" | "EVENT" | "BATTLE" | "SYSTEM";

/** 描述任务的基础玩法分类。 */
export type QuestType = (typeof QUEST_TYPES)[number];

export type { QuestObjectiveType } from "./quest-config.ts";

/** 描述单项任务目标的静态定义。 */
export interface QuestObjectiveDefinition {
  readonly objectiveId: string;
  readonly type: QuestObjectiveType;
  readonly targetId: string | null;
  readonly requiredCount: number;
}

/** 描述不会随运行时进度改变的任务资源定义。 */
export interface QuestDefinition {
  readonly questId: string;
  readonly name: string;
  readonly description: string;
  readonly issuerType: QuestIssuerType;
  readonly issuerId: string | null;
  readonly type: QuestType;
  readonly quality: StandardQuality;
  readonly triggerConditionIds: readonly string[];
  readonly acceptConditionIds: readonly string[];
  readonly objectives: readonly QuestObjectiveDefinition[];
  readonly completionRule: QuestCompletionRule;
  readonly rewardPoolId: string;
  readonly durationTurns: number;
  readonly unique: boolean;
}

/** 描述以任务资源 ID 索引的只读任务定义注册表。 */
export type QuestDefinitionCatalog = Readonly<Record<string, QuestDefinition>>;

/**
 * 方法名：validateQuestDefinition
 * 作用：校验任务静态定义、目标、奖励池引用与资源 ID 是否满足统一配置规范。
 * @param definition 需要校验的任务静态定义。
 * @returns 无返回值。
 * @throws 任务字段为空、目标重复、奖励池引用非法或有效回合数不合法时抛出错误。
 */
export function validateQuestDefinition(definition: QuestDefinition): void {
  assertResourceId(definition.questId, "quest");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");
  assertIssuer(definition.issuerType, definition.issuerId);

  if (!QUEST_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported quest type: ${definition.type}`);
  }

  if (!isStandardQuality(definition.quality)) {
    throw new RangeError(`Unsupported quest quality: ${definition.quality}`);
  }

  validateConditionIds(definition.triggerConditionIds, "triggerConditionIds");
  validateConditionIds(definition.acceptConditionIds, "acceptConditionIds");

  if (definition.objectives.length === 0) {
    throw new Error("A quest must define at least one objective");
  }

  validateQuestObjectives(definition.objectives);

  if (!QUEST_COMPLETION_RULES.includes(definition.completionRule)) {
    throw new RangeError(`Unsupported quest completion rule: ${definition.completionRule}`);
  }
  assertResourceId(definition.rewardPoolId, "reward");
  assertPositiveSafeInteger(definition.durationTurns, "durationTurns");

  if (typeof definition.unique !== "boolean") {
    throw new TypeError("unique must be a boolean");
  }
}

/** 校验任务条件资源标识集合不包含空值或重复项。 */
function validateConditionIds(conditionIds: readonly string[], field: string): void {
  const ids = new Set<string>();

  for (const conditionId of conditionIds) {
    assertResourceId(conditionId, "condition");

    if (ids.has(conditionId)) {
      throw new Error(`${field} cannot contain duplicate condition ids`);
    }

    ids.add(conditionId);
  }
}

/**
 * 方法名：validateQuestDefinitions
 * 作用：校验任务定义集合，并保证同一资源 ID 不会重复出现。
 * @param definitions 需要校验的任务静态定义集合。
 * @returns 无返回值。
 * @throws 任务资源 ID 重复或任意任务定义非法时抛出错误。
 */
export function validateQuestDefinitions(definitions: readonly QuestDefinition[]): void {
  const questIds = new Set<string>();

  for (const definition of definitions) {
    validateQuestDefinition(definition);

    if (questIds.has(definition.questId)) {
      throw new Error(`Duplicate quest id: ${definition.questId}`);
    }

    questIds.add(definition.questId);
  }
}

/**
 * 方法名：validateQuestDefinitionCatalog
 * 作用：校验任务定义注册表的键值一致性和其中所有定义。
 * @param catalog 需要校验的任务定义注册表。
 * @returns 无返回值。
 * @throws 注册表键与任务资源 ID 不一致时抛出错误。
 */
export function validateQuestDefinitionCatalog(catalog: QuestDefinitionCatalog): void {
  validateQuestDefinitions(Object.values(catalog));

  for (const [questId, definition] of Object.entries(catalog)) {
    if (questId !== definition.questId) {
      throw new Error(`Quest catalog key ${questId} does not match quest id ${definition.questId}`);
    }
  }
}

/**
 * 方法名：getQuestDefinition
 * 作用：从任务定义注册表读取指定任务资源。
 * @param catalog 已校验的任务定义注册表。
 * @param questId 需要读取的任务资源 ID。
 * @returns 对应的任务静态定义。
 * @throws 任务资源不存在时抛出错误。
 */
export function getQuestDefinition(
  catalog: QuestDefinitionCatalog,
  questId: string,
): QuestDefinition {
  const definition = catalog[questId];

  if (definition === undefined) {
    throw new Error(`Unknown quest definition: ${questId}`);
  }

  return definition;
}

/**
 * 方法名：validateQuestObjectives
 * 作用：校验任务目标的分类、编号、数量和目标资源标识。
 * @param objectives 需要校验的任务目标集合。
 * @returns 无返回值。
 * @throws 目标编号重复、分类不支持或数量非法时抛出错误。
 */
function validateQuestObjectives(objectives: readonly QuestObjectiveDefinition[]): void {
  const objectiveIds = new Set<string>();

  for (const objective of objectives) {
    assertNonEmptyString(objective.objectiveId, "objectiveId");

    if (objectiveIds.has(objective.objectiveId)) {
      throw new Error(`Duplicate quest objective id: ${objective.objectiveId}`);
    }

    if (!QUEST_OBJECTIVE_TYPES.includes(objective.type)) {
      throw new RangeError(`Unsupported quest objective type: ${objective.type}`);
    }

    assertNullableNonEmptyString(objective.targetId, "objective.targetId");
    assertPositiveSafeInteger(objective.requiredCount, "objective.requiredCount");
    objectiveIds.add(objective.objectiveId);
  }
}

/**
 * 方法名：assertIssuer
 * 作用：校验任务发布来源和发布者标识之间的必填关系。
 * @param issuerType 任务发布来源类型。
 * @param issuerId 发布者或触发来源的可选标识。
 * @returns 无返回值。
 * @throws 发布来源不受支持或来源标识不满足规则时抛出错误。
 */
function assertIssuer(issuerType: QuestIssuerType, issuerId: string | null): void {
  if (!["NPC", "LOCATION", "EVENT", "BATTLE", "SYSTEM"].includes(issuerType)) {
    throw new RangeError(`Unsupported quest issuer type: ${issuerType}`);
  }

  assertNullableNonEmptyString(issuerId, "issuerId");

  if (issuerType !== "SYSTEM" && issuerId === null) {
    throw new Error("Non-system quests must define an issuer id");
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验可空字符串在有值时不为空。 */
function assertNullableNonEmptyString(value: string | null, field: string): void {
  if (value !== null) {
    assertNonEmptyString(value, field);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
