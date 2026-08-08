/** 单步普通移动无法执行时使用的底层地图原因。 */
export const NORMAL_MOVEMENT_UNAVAILABLE_REASONS = [
  "OUTSIDE_MAP",
  "BLOCKED",
  "ENVIRONMENT_BLOCKED",
  "ELEVATION_DIFFERENCE",
] as const;

/** 通过普通连接进入一个相邻地块时需要支付的基础移动力。 */
export const NORMAL_MOVEMENT_STEP_COST = 1;

/** 普通移动允许跨越的最大上升或下降高度差。 */
export const MAX_NORMAL_MOVEMENT_ELEVATION_DIFFERENCE = 3;

/** 一次普通移动结算可能产生的最终结果。 */
export const NORMAL_MOVEMENT_SETTLEMENT_OUTCOMES = [
  /** 计划中的方向均已成功执行。 */
  "completed",
  /** 进入首个未知地块后结束移动。 */
  "first_exploration",
  /** 剩余移动力无法支付下一步基础成本。 */
  "insufficient_movement",
  /** 下一步目标地块不可通行。 */
  "blocked",
  /** 下一步目标位于基础地图之外。 */
  "outside_map",
  /** 下一步上升或下降的高度差超过普通移动限制。 */
  "elevation_difference",
] as const;
