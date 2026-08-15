import type { ItemDefinitionCatalog } from "./item-definition.ts";

/** 描述物品池中单个可被带权抽取的物品及其发放数量。 */
export interface ItemPoolEntry {
  readonly itemDefinitionId: string;
  readonly quantity: number;
  readonly weight: number;
}

/** 描述用于掉落、事件和奖励的静态物品候选池。 */
export interface ItemPoolDefinition {
  readonly poolId: string;
  readonly entries: readonly ItemPoolEntry[];
}

/** 按稳定池标识索引全部物品池定义。 */
export type ItemPoolDefinitionCatalog = Readonly<Record<string, ItemPoolDefinition>>;

/**
 * 方法名：validateItemPoolDefinitionCatalog
 * 作用：校验物品池编号、候选权重和全部物品定义引用的合法性。
 * @param catalog 需要校验的物品池配置注册表。
 * @param itemDefinitions 用于验证候选物品引用的静态物品定义注册表。
 * @returns 无返回值。
 * @throws 物品池为空、编号不一致、权重非法或物品引用不存在时抛出错误。
 */
export function validateItemPoolDefinitionCatalog(
  catalog: ItemPoolDefinitionCatalog,
  itemDefinitions: ItemDefinitionCatalog,
): void {
  for (const [poolId, definition] of Object.entries(catalog)) {
    if (definition.poolId !== poolId || poolId.trim().length === 0) {
      throw new Error(`Invalid item pool id: ${poolId}`);
    }

    if (definition.entries.length === 0) {
      throw new RangeError(`Item pool ${poolId} must contain at least one entry`);
    }

    let totalWeight = 0;

    for (const entry of definition.entries) {
      if (itemDefinitions[entry.itemDefinitionId] === undefined) {
        throw new Error(`Item pool ${poolId} references unknown item ${entry.itemDefinitionId}`);
      }

      if (!Number.isSafeInteger(entry.quantity) || entry.quantity <= 0) {
        throw new RangeError(`Item pool ${poolId} entry quantity must be a positive safe integer`);
      }

      if (!Number.isSafeInteger(entry.weight) || entry.weight < 0) {
        throw new RangeError(
          `Item pool ${poolId} entry weight must be a non-negative safe integer`,
        );
      }

      totalWeight += entry.weight;
    }

    if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
      throw new RangeError(`Item pool ${poolId} must have a positive total weight`);
    }
  }
}
