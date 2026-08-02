/** 三级背包共用的底层固定网格宽度。 */
export const BACKPACK_GRID_WIDTH = 6;
/** 三级背包共用的底层固定网格高度。 */
export const BACKPACK_GRID_HEIGHT = 8;

/** 当前版本支持的背包等级。 */
export const BACKPACK_LEVELS = [1, 2, 3] as const;

/** 各等级从固定网格左上角开始解锁的可用区域。 */
export const BACKPACK_USABLE_AREAS = {
  1: { width: 4, height: 6 },
  2: { width: 6, height: 6 },
  3: { width: 6, height: 8 },
} as const;
