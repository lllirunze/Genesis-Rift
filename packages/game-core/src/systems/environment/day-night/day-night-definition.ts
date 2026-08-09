/** 描述昼夜系统支持的稳定公开阶段标识。 */
export const DAY_NIGHT_PERIOD_IDS = ["day", "night"] as const;

/** 描述昼夜阶段提供给其他业务系统读取的固定环境效果。 */
export interface DayNightPeriodDefinition {
  readonly periodId: DayNightPeriodId;
  readonly publicTags: readonly string[];
  readonly visionModifier: number;
}

/** 描述以昼夜阶段标识索引的只读定义注册表。 */
export type DayNightPeriodDefinitionCatalog = Readonly<
  Record<DayNightPeriodId, DayNightPeriodDefinition>
>;

/** 描述当前昼夜所处的固定公开阶段。 */
export type DayNightPeriodId = (typeof DAY_NIGHT_PERIOD_IDS)[number];

/**
 * 方法名：validateDayNightPeriodDefinitionCatalog
 * 作用：校验昼夜阶段定义覆盖白天与黑夜，且标签和视野修正满足基础数值规则。
 * @param catalog 需要校验的昼夜阶段定义注册表。
 * @returns 无返回值。
 * @throws 阶段缺失、定义标识不一致、标签重复或视野修正非法时抛出错误。
 */
export function validateDayNightPeriodDefinitionCatalog(
  catalog: DayNightPeriodDefinitionCatalog,
): void {
  for (const periodId of DAY_NIGHT_PERIOD_IDS) {
    const definition = catalog[periodId];

    if (definition === undefined) {
      throw new Error(`Missing day-night period definition: ${periodId}`);
    }
    if (definition.periodId !== periodId) {
      throw new Error(`Day-night period definition key mismatch: ${periodId}`);
    }
    if (!Number.isSafeInteger(definition.visionModifier)) {
      throw new RangeError("Day-night visionModifier must be a safe integer");
    }

    const tags = new Set<string>();
    for (const tag of definition.publicTags) {
      if (typeof tag !== "string" || tag.trim().length === 0) {
        throw new TypeError("Day-night publicTags must contain non-empty strings");
      }
      if (tags.has(tag)) {
        throw new Error(`Duplicate day-night public tag: ${tag}`);
      }
      tags.add(tag);
    }
  }
}

/**
 * 方法名：getDayNightPeriodDefinition
 * 作用：读取指定昼夜阶段的静态公开效果定义。
 * @param catalog 已加载的昼夜阶段定义注册表。
 * @param periodId 需要读取的昼夜阶段标识。
 * @returns 对应昼夜阶段的静态定义。
 * @throws 注册表未包含指定阶段时抛出错误。
 */
export function getDayNightPeriodDefinition(
  catalog: DayNightPeriodDefinitionCatalog,
  periodId: DayNightPeriodId,
): DayNightPeriodDefinition {
  const definition = catalog[periodId];

  if (definition === undefined) {
    throw new Error(`Unknown day-night period: ${periodId}`);
  }

  return definition;
}
