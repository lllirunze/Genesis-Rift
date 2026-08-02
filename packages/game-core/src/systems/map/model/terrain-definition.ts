/** 描述业务对象不随运行过程改变的静态定义。 */
export interface TerrainDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly tags: readonly string[];
}

/** 描述以标识索引业务定义的只读注册表。 */
export type TerrainDefinitionCatalog = Readonly<Record<string, TerrainDefinition>>;

/**
 * 方法名：validateTerrainDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateTerrainDefinition(definition: TerrainDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertUniqueNonEmptyStrings(definition.tags, "tags");
}

/**
 * 方法名：validateTerrainDefinitionCatalog
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateTerrainDefinitionCatalog(catalog: TerrainDefinitionCatalog): void {
  for (const [catalogId, definition] of Object.entries(catalog)) {
    validateTerrainDefinition(definition);

    if (catalogId !== definition.definitionId) {
      throw new Error(
        `Terrain catalog key ${catalogId} does not match definition id ${definition.definitionId}`,
      );
    }
  }
}

/**
 * 方法名：getTerrainDefinition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param catalog 方法所需的 catalog 参数。
 * @param definitionId 目标配置定义标识。
 * @returns 本次处理得到的结果。
 */
export function getTerrainDefinition(
  catalog: TerrainDefinitionCatalog,
  definitionId: string,
): TerrainDefinition {
  const definition = catalog[definitionId];

  if (definition === undefined) {
    throw new Error(`Unknown terrain definition: ${definitionId}`);
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
