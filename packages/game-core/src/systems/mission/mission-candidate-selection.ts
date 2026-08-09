import type { MissionType } from "./mission-config.ts";
import {
  validateMissionDefinitionCatalog,
  type MissionDefinition,
  type MissionDefinitionCatalog,
} from "./mission-definition.ts";

/** 描述生成使命候选池时由角色和世界系统提供的只读上下文。 */
export interface MissionGenerationContext {
  readonly identityId: string;
  readonly faithId: string;
  readonly enabledModuleIds: readonly string[];
  readonly availableContentIds: readonly string[];
  readonly worldStateKeys: readonly string[];
}

/**
 * 方法名：collectMissionCandidates
 * 作用：在随机抽取前，根据使命类型、角色身份、信仰、已启用模块和世界可达内容筛选合法候选。
 * @param catalog 静态使命定义注册表。
 * @param type 本次需要生成的固定使命类型。
 * @param context 当前角色与世界提供的只读生成上下文。
 * @returns 全部条件满足且基础权重大于零的使命定义列表。
 * @throws 生成上下文或静态使命定义非法时抛出错误。
 */
export function collectMissionCandidates(
  catalog: MissionDefinitionCatalog,
  type: MissionType,
  context: MissionGenerationContext,
): readonly MissionDefinition[] {
  validateMissionDefinitionCatalog(catalog);
  validateMissionGenerationContext(context);

  return Object.freeze(
    Object.values(catalog).filter(
      (definition) =>
        definition.type === type &&
        definition.baseWeight > 0 &&
        isMissionEligible(definition, context),
    ),
  );
}

/**
 * 方法名：isMissionEligible
 * 作用：判断单个使命是否满足当前角色和世界提供的全部候选条件。
 * @param definition 需要检查的静态使命定义。
 * @param context 当前角色与世界提供的只读生成上下文。
 * @returns 使命可以进入本次候选池时返回真。
 */
export function isMissionEligible(
  definition: MissionDefinition,
  context: MissionGenerationContext,
): boolean {
  return (
    matchesOptionalIdentity(definition.eligibility.identityIds, context.identityId) &&
    matchesOptionalIdentity(definition.eligibility.faithIds, context.faithId) &&
    includesAll(context.enabledModuleIds, definition.eligibility.requiredModuleIds) &&
    includesAll(context.availableContentIds, definition.eligibility.requiredContentIds) &&
    includesAll(context.worldStateKeys, definition.eligibility.requiredWorldStateKeys)
  );
}

/** 校验使命生成上下文中的标识均不为空且不重复。 */
export function validateMissionGenerationContext(context: MissionGenerationContext): void {
  assertNonEmptyString(context.identityId, "identityId");
  assertNonEmptyString(context.faithId, "faithId");
  validateUniqueNonEmptyStrings(context.enabledModuleIds, "enabledModuleIds");
  validateUniqueNonEmptyStrings(context.availableContentIds, "availableContentIds");
  validateUniqueNonEmptyStrings(context.worldStateKeys, "worldStateKeys");
}

/** 当没有限定身份或信仰时允许所有玩家使用该使命。 */
function matchesOptionalIdentity(allowedIds: readonly string[], currentId: string): boolean {
  return allowedIds.length === 0 || allowedIds.includes(currentId);
}

/** 判断当前上下文是否包含使命要求的所有标识。 */
function includesAll(actualIds: readonly string[], requiredIds: readonly string[]): boolean {
  return requiredIds.every((requiredId) => actualIds.includes(requiredId));
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
