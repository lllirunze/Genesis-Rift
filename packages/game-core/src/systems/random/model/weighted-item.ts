/** 描述当前模块对外公开的业务数据契约。 */
export interface WeightedItem<Item> {
  readonly item: Item;
  readonly weight: number;
}
