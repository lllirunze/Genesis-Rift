import { assertResourceId } from "@genesis-rift/shared";

import {
  MISSION_DIFFICULTIES,
  MISSION_TYPES,
  type MissionDifficulty,
  type MissionType,
} from "./mission-config.ts";

/** 描述使命进入生成候选池前必须满足的角色与世界条件。 */
export interface MissionEligibility {
  readonly identityIds: readonly string[];
  readonly faithIds: readonly string[];
  readonly requiredModuleIds: readonly string[];
  readonly requiredContentIds: readonly string[];
  readonly requiredWorldStateKeys: readonly string[];
}

/** 描述不会随玩家进度变化的使命资源定义。 */
export interface MissionDefinition {
  readonly missionId: string;
  readonly name: string;
  readonly description: string;
  readonly type: MissionType;
  readonly progressKey: string;
  readonly requiredProgress: number;
  readonly difficulty: MissionDifficulty;
  readonly baseWeight: number;
  readonly eligibility: MissionEligibility;
  readonly gameplayTags: readonly string[];
  readonly conflictTags: readonly string[];
  readonly replacementGroupId: string;
}

/** 描述以使命资源 ID 索引的只读使命定义注册表。 */
export type MissionDefinitionCatalog = Readonly<Record<string, MissionDefinition>>;

/**
 * 方法名：validateMissionDefinition
 * 作用：校验使命静态定义的资源标识、进度目标、玩法标签与自动替换分组。
 * @param definition 需要校验的使命资源定义。
 * @returns 无返回值。
 * @throws 使命字段为空、类型不支持、数值非法或标签重复时抛出错误。
 */
export function validateMissionDefinition(definition: MissionDefinition): void {
  assertResourceId(definition.missionId, "mission");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");
  assertNonEmptyString(definition.progressKey, "progressKey");
  assertNonEmptyString(definition.replacementGroupId, "replacementGroupId");

  if (!MISSION_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported mission type: ${definition.type}`);
  }

  assertPositiveSafeInteger(definition.requiredProgress, "requiredProgress");
  if (!MISSION_DIFFICULTIES.includes(definition.difficulty)) {
    throw new RangeError(`Unsupported mission difficulty: ${definition.difficulty}`);
  }
  assertNonNegativeSafeInteger(definition.baseWeight, "baseWeight");
  validateMissionEligibility(definition.eligibility);
  validateUniqueNonEmptyStrings(definition.gameplayTags, "gameplayTags");
  validateUniqueNonEmptyStrings(definition.conflictTags, "conflictTags");
}

/** 校验使命候选条件中的标识集合均不为空且不重复。 */
function validateMissionEligibility(eligibility: MissionEligibility): void {
  validateUniqueNonEmptyStrings(eligibility.identityIds, "eligibility.identityIds");
  validateUniqueNonEmptyStrings(eligibility.faithIds, "eligibility.faithIds");
  validateUniqueNonEmptyStrings(eligibility.requiredModuleIds, "eligibility.requiredModuleIds");
  validateUniqueNonEmptyStrings(eligibility.requiredContentIds, "eligibility.requiredContentIds");
  validateUniqueNonEmptyStrings(
    eligibility.requiredWorldStateKeys,
    "eligibility.requiredWorldStateKeys",
  );
}

/**
 * 方法名：validateMissionDefinitionCatalog
 * 作用：校验使命定义注册表的键值一致性与其中全部使命资源。
 * @param catalog 需要校验的使命资源定义注册表。
 * @returns 无返回值。
 * @throws 注册表键与使命资源标识不一致，或任意使命定义非法时抛出错误。
 */
export function validateMissionDefinitionCatalog(catalog: MissionDefinitionCatalog): void {
  for (const [missionId, definition] of Object.entries(catalog)) {
    validateMissionDefinition(definition);

    if (missionId !== definition.missionId) {
      throw new Error(`Mission catalog key ${missionId} does not match ${definition.missionId}`);
    }
  }
}

/**
 * 方法名：getMissionDefinition
 * 作用：从已加载的使命定义注册表读取指定使命资源。
 * @param catalog 已校验的使命定义注册表。
 * @param missionId 需要读取的使命资源标识。
 * @returns 对应的静态使命资源定义。
 * @throws 找不到使命资源时抛出错误。
 */
export function getMissionDefinition(
  catalog: MissionDefinitionCatalog,
  missionId: string,
): MissionDefinition {
  const definition = catalog[missionId];

  if (definition === undefined) {
    throw new Error(`Unknown mission definition: ${missionId}`);
  }

  return definition;
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验字符串数组中的元素均不为空且不重复。 */
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
