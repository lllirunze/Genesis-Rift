/** 物品系统支持的职责类别，用于类型收窄与配置校验。 */
export const ITEM_CATEGORIES = [
  /** 作为交易媒介并占用背包空间的货币。 */
  "currency",
  /** 用于制造、提交或交易的材料。 */
  "material",
  /** 使用后产生效果并消耗数量的物品。 */
  "consumable",
  /** 可以穿戴至角色装备栏的物品。 */
  "equipment",
  /** 用于永久掌握制造知识的图纸。 */
  "blueprint",
  /** 由任务流程管理的关键物品。 */
  "quest",
  /** 无法归入常规类别的特殊功能物品。 */
  "special",
] as const;

/** 元宝物品在统一物品定义表中的固定标识。 */
export const COIN_ITEM_DEFINITION_ID = "item.coin";
