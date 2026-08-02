/** 特殊连接相对于配置起点和终点允许使用的方向。 */
export const SPECIAL_CONNECTION_DIRECTIONS = ["ONE_WAY", "TWO_WAY"] as const;

/** 特殊连接执行时采用的空间移动模式。 */
export const SPECIAL_CONNECTION_TRAVERSAL_MODES = ["PATH", "TELEPORT"] as const;

/** 特殊连接向玩家公开的默认方式。 */
export const SPECIAL_CONNECTION_VISIBILITIES = ["PUBLIC", "HIDDEN"] as const;

/** 特殊连接结算可能产生的标准结果。 */
export const SPECIAL_CONNECTION_SETTLEMENT_OUTCOMES = [
  "completed",
  "first_exploration",
  "disabled",
  "undiscovered",
  "condition_not_met",
  "invalid_origin",
  "blocked",
  "insufficient_movement",
] as const;
