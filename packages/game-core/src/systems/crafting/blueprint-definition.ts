import { assertResourceId, type ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 描述单项制造材料需求。 */
export interface BlueprintMaterialRequirement {
  readonly itemDefinitionId: string;
  readonly quantity: number;
}

/** 描述不会随运行时变化的图纸配方定义。 */
export interface BlueprintDefinition {
  readonly blueprintId: string;
  readonly sourceItemDefinitionId: string;
  readonly name: string;
  readonly productItemDefinitionId: string;
  readonly materialRequirements: readonly BlueprintMaterialRequirement[];
  readonly coinCost: number;
  readonly requiredConditionIds: readonly string[];
}

/** 描述以图纸资源 ID 索引的只读图纸注册表。 */
export type BlueprintDefinitionCatalog = Readonly<Record<string, BlueprintDefinition>>;

/**
 * 方法名：validateBlueprintDefinition
 * 作用：校验图纸配方的资源引用、材料需求与制造费用。
 * @param definition 需要校验的图纸定义。
 * @param itemDefinitions 可引用的物品定义注册表。
 * @returns 无返回值。
 * @throws 图纸字段、资源引用或材料需求不合法时抛出错误。
 */
export function validateBlueprintDefinition(
  definition: BlueprintDefinition,
  itemDefinitions: ItemDefinitionCatalog,
): void {
  assertResourceId(definition.blueprintId, "blueprint");
  assertResourceId(definition.sourceItemDefinitionId, "item");
  assertResourceId(definition.productItemDefinitionId);
  assertNonEmptyString(definition.name, "name");
  assertNonNegativeSafeInteger(definition.coinCost, "coinCost");

  const sourceItem = itemDefinitions[definition.sourceItemDefinitionId];
  const productItem = itemDefinitions[definition.productItemDefinitionId];

  if (sourceItem === undefined) {
    throw new Error(`Unknown blueprint source item: ${definition.sourceItemDefinitionId}`);
  }

  if (productItem === undefined) {
    throw new Error(`Unknown blueprint product item: ${definition.productItemDefinitionId}`);
  }

  const materialIds = new Set<string>();

  for (const requirement of definition.materialRequirements) {
    assertResourceId(requirement.itemDefinitionId, "item");
    assertPositiveSafeInteger(requirement.quantity, "materialRequirements.quantity");

    if (itemDefinitions[requirement.itemDefinitionId] === undefined) {
      throw new Error(`Unknown blueprint material item: ${requirement.itemDefinitionId}`);
    }

    if (materialIds.has(requirement.itemDefinitionId)) {
      throw new Error(`Duplicate blueprint material item: ${requirement.itemDefinitionId}`);
    }

    materialIds.add(requirement.itemDefinitionId);
  }

  const conditionIds = new Set<string>();

  for (const conditionId of definition.requiredConditionIds) {
    assertResourceId(conditionId, "condition");

    if (conditionIds.has(conditionId)) {
      throw new Error(`Duplicate blueprint condition id: ${conditionId}`);
    }

    conditionIds.add(conditionId);
  }
}

/**
 * 方法名：validateBlueprintDefinitionCatalog
 * 作用：校验图纸注册表的键值关系与所有图纸定义。
 * @param catalog 图纸定义注册表。
 * @param itemDefinitions 可引用的物品定义注册表。
 * @returns 无返回值。
 * @throws 注册表键与图纸 ID 不一致或定义不合法时抛出错误。
 */
export function validateBlueprintDefinitionCatalog(
  catalog: BlueprintDefinitionCatalog,
  itemDefinitions: ItemDefinitionCatalog,
): void {
  for (const [blueprintId, definition] of Object.entries(catalog)) {
    if (blueprintId !== definition.blueprintId) {
      throw new Error(
        `Blueprint catalog key ${blueprintId} does not match ${definition.blueprintId}`,
      );
    }

    validateBlueprintDefinition(definition, itemDefinitions);
  }
}

/** 校验非空字符串。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

/** 校验非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}
