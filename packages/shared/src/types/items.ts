import type { Quality } from "./quality.ts";
import { ITEM_CATEGORIES } from "../config/item-config.ts";

/** 物品在系统中的职责分类。 */
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** 所有可进入背包的物品共用的静态定义。 */
export interface ItemDefinition {
  /** 全局唯一且不会随显示文本变化的物品定义标识。 */
  readonly definitionId: string;
  /** 供业务和日志使用的英文物品名称。 */
  readonly name: string;
  /** 物品所属的功能类别。 */
  readonly category: ItemCategory;
  /** 物品品质；神话品质仅作预留。 */
  readonly quality: Quality;
  /** 物品在背包中横向占据的格数。 */
  readonly width: number;
  /** 物品在背包中纵向占据的格数。 */
  readonly height: number;
  /** 单个物品实例允许容纳的最大数量。 */
  readonly maximumStack: number;
}

/** 以定义标识索引的只读物品定义表。 */
export type ItemDefinitionCatalog = Readonly<Record<string, ItemDefinition>>;
