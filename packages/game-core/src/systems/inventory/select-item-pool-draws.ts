import { pickWeightedItem, type RandomStream } from "../random/index.ts";

import type { ItemPoolDefinitionCatalog } from "./item-pool-definition.ts";

/** 描述一次物品池抽取确定的物品定义与发放数量。 */
export interface ItemPoolDraw {
  readonly itemDefinitionId: string;
  readonly quantity: number;
}

/**
 * 方法名：selectItemPoolDraws
 * 作用：从指定物品池按权重独立抽取指定次数，生成可交给背包系统发放的物品结果。
 * @param randomStream 当前业务独占的确定性随机流。
 * @param catalog 静态物品池配置注册表。
 * @param poolId 需要抽取的物品池标识。
 * @param drawCount 需要独立抽取的次数。
 * @returns 保持抽取顺序的物品发放结果。
 * @throws 物品池不存在或抽取次数非法时抛出错误。
 */
export function selectItemPoolDraws(
  randomStream: RandomStream,
  catalog: ItemPoolDefinitionCatalog,
  poolId: string,
  drawCount: number,
): readonly ItemPoolDraw[] {
  const pool = catalog[poolId];

  if (pool === undefined) {
    throw new Error(`Unknown item pool: ${poolId}`);
  }

  if (!Number.isSafeInteger(drawCount) || drawCount <= 0) {
    throw new RangeError("drawCount must be a positive safe integer");
  }

  return Object.freeze(
    Array.from({ length: drawCount }, () => {
      const entry = pickWeightedItem(
        randomStream,
        pool.entries.map((item) => ({ item, weight: item.weight })),
      );
      return Object.freeze({ itemDefinitionId: entry.itemDefinitionId, quantity: entry.quantity });
    }),
  );
}
