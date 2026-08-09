import { assertResourceId, type ItemDefinitionCatalog } from "@genesis-rift/shared";

/** 描述商店中一种无限库存商品的物品引用和单件元宝价格。 */
export interface ShopItemDefinition {
  readonly itemDefinitionId: string;
  readonly unitCoinPrice: number;
}

/** 描述不随运行过程改变的商店静态商品配置。 */
export interface ShopDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly items: readonly ShopItemDefinition[];
}

/** 描述以商店资源标识索引的只读商店定义注册表。 */
export type ShopDefinitionCatalog = Readonly<Record<string, ShopDefinition>>;

/**
 * 方法名：validateShopDefinition
 * 作用：校验商店资源标识、商品物品引用和单件元宝价格。
 * @param definition 需要校验的商店静态定义。
 * @param itemDefinitions 可供商店上架的物品定义注册表。
 * @returns 无返回值。
 * @throws 商店标识、商品物品引用、重复商品或价格非法时抛出错误。
 */
export function validateShopDefinition(
  definition: ShopDefinition,
  itemDefinitions: ItemDefinitionCatalog,
): void {
  assertResourceId(definition.definitionId, "shop");
  assertNonEmptyString(definition.name, "name");
  const itemDefinitionIds = new Set<string>();

  for (const item of definition.items) {
    assertResourceId(item.itemDefinitionId);
    assertNonNegativeSafeInteger(item.unitCoinPrice, "unitCoinPrice");

    if (itemDefinitions[item.itemDefinitionId] === undefined) {
      throw new Error(`Shop item definition not found: ${item.itemDefinitionId}`);
    }

    if (itemDefinitionIds.has(item.itemDefinitionId)) {
      throw new Error(`Duplicate shop item definition: ${item.itemDefinitionId}`);
    }

    itemDefinitionIds.add(item.itemDefinitionId);
  }
}

/**
 * 方法名：validateShopDefinitionCatalog
 * 作用：校验商店注册表索引与全部商店商品定义保持一致。
 * @param catalog 需要校验的商店定义注册表。
 * @param itemDefinitions 可供商店上架的物品定义注册表。
 * @returns 无返回值。
 * @throws 注册表索引与商店定义标识不一致时抛出错误。
 */
export function validateShopDefinitionCatalog(
  catalog: ShopDefinitionCatalog,
  itemDefinitions: ItemDefinitionCatalog,
): void {
  for (const [definitionId, definition] of Object.entries(catalog)) {
    if (definitionId !== definition.definitionId) {
      throw new Error(`Shop catalog key does not match definition id: ${definitionId}`);
    }

    validateShopDefinition(definition, itemDefinitions);
  }
}

/**
 * 方法名：getShopItemDefinition
 * 作用：读取商店已上架的指定商品配置。
 * @param definition 商店静态定义。
 * @param itemDefinitionId 需要购买的物品定义标识。
 * @returns 商品已上架时返回其价格定义；否则返回 null。
 */
export function getShopItemDefinition(
  definition: ShopDefinition,
  itemDefinitionId: string,
): ShopItemDefinition | null {
  return definition.items.find((item) => item.itemDefinitionId === itemDefinitionId) ?? null;
}

/** 校验非空字符串。 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/** 校验非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
