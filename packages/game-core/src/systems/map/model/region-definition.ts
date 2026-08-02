import { REGION_CATEGORIES } from "../map-content-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type RegionCategory = (typeof REGION_CATEGORIES)[number];

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface RegionDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly category: RegionCategory;
  readonly tags: readonly string[];
}

/** 描述以标识索引业务定义的只读注册表。 */
export type RegionDefinitionCatalog = Readonly<Record<string, RegionDefinition>>;

/**
 * 方法名：validateRegionDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateRegionDefinition(definition: RegionDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");

  if (!REGION_CATEGORIES.includes(definition.category)) {
    throw new RangeError(`Unsupported region category: ${definition.category}`);
  }

  assertUniqueNonEmptyStrings(definition.tags, "tags");
}

/**
 * 方法名：validateRegionDefinitionCatalog
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateRegionDefinitionCatalog(catalog: RegionDefinitionCatalog): void {
  for (const [catalogId, definition] of Object.entries(catalog)) {
    validateRegionDefinition(definition);

    if (catalogId !== definition.definitionId) {
      throw new Error(
        `Region catalog key ${catalogId} does not match definition id ${definition.definitionId}`,
      );
    }
  }
}

/**
 * 方法名：getRegionDefinition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param definitionId 目标配置定义标识。
 * @returns 本次处理得到的结果。
 */
export function getRegionDefinition(
  catalog: RegionDefinitionCatalog,
  definitionId: string,
): RegionDefinition {
  const definition = catalog[definitionId];

  if (definition === undefined) {
    throw new Error(`Unknown region definition: ${definitionId}`);
  }

  return definition;
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param values 方法所需的 values 参数。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
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
