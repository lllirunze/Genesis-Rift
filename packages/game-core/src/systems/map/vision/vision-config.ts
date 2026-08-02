/** 视野目标不可见时可能产生的标准原因。 */
export const TILE_VISIBILITY_HIDDEN_REASONS = [
  "NOT_EXPLORED",
  "OUT_OF_RANGE",
  "LINE_OF_SIGHT_BLOCKED",
] as const;

/** 地图地块在三层战争迷雾中可能拥有的信息状态。 */
export const MAP_TILE_INFORMATION_STATES = [
  "UNKNOWN",
  "CURRENTLY_VISIBLE",
  "EXPLORED_NOT_VISIBLE",
] as const;
